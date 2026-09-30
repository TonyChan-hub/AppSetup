import { Buffer } from 'buffer';
import TcpSocket from 'react-native-tcp-socket';

import { sha1Base64 } from './sha1';

type Socket = import('react-native-tcp-socket').Socket;
type Server = import('react-native-tcp-socket').Server;

export type WsConnection = {
  sendText: (text: string) => void;
  close: () => void;
};

export type WsServerOptions = {
  port: number;
  path: string;
  onConnection: (conn: WsConnection) => void;
  onMessage: (conn: WsConnection, text: string) => void;
  onClose: (conn: WsConnection) => void;
};

/**
 * Minimal RFC6455 WebSocket server for Zippy probe (text frames only).
 */
export class WsServer {
  private server: Server | null = null;
  private readonly connections = new Map<Socket, WsConnection>();

  constructor(private readonly options: WsServerOptions) {}

  async start(): Promise<number> {
    if (this.server) {
      return this.options.port;
    }

    return new Promise((resolve, reject) => {
      const server = TcpSocket.createServer((socket: Socket) => {
        this.handleSocket(socket);
      });

      server.on('error', (error: Error) => {
        reject(error);
      });

      server.listen(
        { port: this.options.port, host: '0.0.0.0', reuseAddress: true },
        () => {
          this.server = server;
          resolve(this.options.port);
        },
      );
    });
  }

  async stop(): Promise<void> {
    for (const [socket, conn] of this.connections.entries()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
      socket.destroy();
    }
    this.connections.clear();

    const server = this.server;
    this.server = null;
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  private handleSocket(socket: Socket): void {
    let handshakeDone = false;
    let buffer = Buffer.alloc(0);
    let conn: WsConnection | null = null;

    const sendText = (text: string) => {
      if (!handshakeDone) {
        return;
      }
      const payload = Buffer.from(text, 'utf8');
      socket.write(encodeTextFrame(payload));
    };

    const close = () => {
      try {
        if (handshakeDone) {
          socket.write(Buffer.from([0x88, 0x00]));
        }
      } catch {
        // ignore
      }
      socket.destroy();
    };

    socket.on('data', (data) => {
      const chunk =
        typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
      buffer = Buffer.concat([buffer, chunk]);

      if (!handshakeDone) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd < 0) {
          return;
        }
        const headerText = buffer.slice(0, headerEnd).toString('utf8');
        buffer = buffer.slice(headerEnd + 4);
        const accepted = this.acceptHandshake(socket, headerText);
        if (!accepted) {
          socket.destroy();
          return;
        }
        handshakeDone = true;
        conn = { sendText, close };
        this.connections.set(socket, conn);
        this.options.onConnection(conn);
      }

      if (!conn) {
        return;
      }

      while (true) {
        const parsed = decodeFrame(buffer);
        if (!parsed) {
          break;
        }
        buffer = parsed.rest;
        if (parsed.opcode === 0x8) {
          close();
          return;
        }
        if (parsed.opcode === 0x9) {
          socket.write(encodeControlFrame(0xa, parsed.payload));
          continue;
        }
        if (parsed.opcode === 0x1) {
          this.options.onMessage(conn, parsed.payload.toString('utf8'));
        }
      }
    });

    socket.on('close', () => {
      const existing = this.connections.get(socket);
      if (existing) {
        this.connections.delete(socket);
        this.options.onClose(existing);
      }
    });

    socket.on('error', () => {
      socket.destroy();
    });
  }

  private acceptHandshake(socket: Socket, headerText: string): boolean {
    const lines = headerText.split('\r\n');
    const requestLine = lines[0] ?? '';
    const match = /^GET\s+(\S+)\s+HTTP\/1\.1$/i.exec(requestLine);
    if (!match) {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return false;
    }
    const reqPath = match[1]!.split('?')[0];
    const expected = this.options.path.startsWith('/')
      ? this.options.path
      : `/${this.options.path}`;
    if (reqPath !== expected) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      return false;
    }

    const headers: Record<string, string> = {};
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i]!;
      const idx = line.indexOf(':');
      if (idx > 0) {
        headers[line.slice(0, idx).trim().toLowerCase()] = line
          .slice(idx + 1)
          .trim();
      }
    }

    const key = headers['sec-websocket-key'];
    if (!key || (headers.upgrade ?? '').toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return false;
    }

    const accept = sha1Base64(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`);
    const response =
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`;
    socket.write(response);
    return true;
  }
}

function encodeTextFrame(payload: Buffer): Buffer {
  const len = payload.length;
  if (len < 126) {
    return Buffer.concat([Buffer.from([0x81, len]), payload]);
  }
  if (len < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeUInt32BE(0, 2);
  header.writeUInt32BE(len, 6);
  return Buffer.concat([header, payload]);
}

function encodeControlFrame(opcode: number, payload: Buffer): Buffer {
  const len = Math.min(payload.length, 125);
  return Buffer.concat([
    Buffer.from([0x80 | opcode, len]),
    payload.slice(0, len),
  ]);
}

function decodeFrame(
  buffer: Buffer,
): { opcode: number; payload: Buffer; rest: Buffer } | null {
  if (buffer.length < 2) {
    return null;
  }
  const first = buffer[0]!;
  const second = buffer[1]!;
  const opcode = first & 0x0f;
  const masked = (second & 0x80) !== 0;
  let payloadLen = second & 0x7f;
  let offset = 2;

  if (payloadLen === 126) {
    if (buffer.length < 4) {
      return null;
    }
    payloadLen = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buffer.length < 10) {
      return null;
    }
    const high = buffer.readUInt32BE(2);
    const low = buffer.readUInt32BE(6);
    if (high !== 0) {
      throw new Error('Frame too large');
    }
    payloadLen = low;
    offset = 10;
  }

  const maskLen = masked ? 4 : 0;
  if (buffer.length < offset + maskLen + payloadLen) {
    return null;
  }

  let payload: Buffer;
  if (masked) {
    const mask = buffer.slice(offset, offset + 4);
    offset += 4;
    payload = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i += 1) {
      payload[i] = buffer[offset + i]! ^ mask[i % 4]!;
    }
  } else {
    payload = buffer.slice(offset, offset + payloadLen);
  }

  return {
    opcode,
    payload,
    rest: buffer.slice(offset + payloadLen),
  };
}
