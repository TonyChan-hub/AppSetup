declare const __DEV__: boolean;

declare module 'react-native-tcp-socket' {
  import type { EventEmitter } from 'events';

  export type ServerOptions = {
    port: number;
    host?: string;
    reuseAddress?: boolean;
  };

  export interface Socket extends EventEmitter {
    write(data: string | Uint8Array, encoding?: string): boolean;
    destroy(): void;
    on(event: 'data', listener: (data: string | Buffer) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
  }

  export interface Server extends EventEmitter {
    listen(options: ServerOptions, callback?: () => void): void;
    close(callback?: () => void): void;
    on(event: 'error', listener: (error: Error) => void): this;
  }

  const TcpSocket: {
    createServer(connectionListener: (socket: Socket) => void): Server;
  };

  export default TcpSocket;
}

declare module 'buffer' {
  export class Buffer extends Uint8Array {
    static alloc(size: number): Buffer;
    static concat(list: Buffer[]): Buffer;
    static from(data: string | ArrayBuffer | Uint8Array | number[], encoding?: string): Buffer;
    indexOf(value: string | number | Uint8Array): number;
    slice(start?: number, end?: number): Buffer;
    toString(encoding?: string): string;
    writeUInt16BE(value: number, offset: number): number;
    writeUInt32BE(value: number, offset: number): number;
    readUInt16BE(offset: number): number;
    readUInt32BE(offset: number): number;
  }
}
