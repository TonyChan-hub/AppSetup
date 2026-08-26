import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import {
  DEFAULT_PROBE_PORT,
  EventType,
  MessageKind,
  createRequest,
} from '@bear1210/zippy-probe-protocol';

export class ProbeClient extends EventEmitter {
  /** @type {WebSocket | null} */
  #socket = null;
  /** @type {Map<string, { resolve: Function, reject: Function }>} */
  #pending = new Map();
  #url = '';
  #connected = false;

  get connected() {
    return this.#connected;
  }

  get url() {
    return this.#url;
  }

  /**
   * @param {string} host
   * @param {number} [port]
   */
  connect(host, port = DEFAULT_PROBE_PORT) {
    this.disconnect();
    this.#url = `ws://${host}:${port}/probe`;

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.#url);
      this.#socket = socket;

      socket.once('open', async () => {
        this.#connected = true;
        this.emit('status', { connected: true, url: this.#url });
        try {
          await this.request('ping');
          resolve({ url: this.#url });
        } catch (error) {
          reject(error);
        }
      });

      socket.on('message', (data) => {
        this.#handleMessage(data.toString());
      });

      socket.on('close', () => {
        this.#connected = false;
        this.emit('status', { connected: false, url: this.#url });
        this.#rejectAll(new Error('Probe connection closed'));
      });

      socket.on('error', (error) => {
        if (!this.#connected) {
          reject(error);
        }
        this.emit('error', error);
      });
    });
  }

  disconnect() {
    if (this.#socket) {
      this.#socket.removeAllListeners();
      this.#socket.close();
      this.#socket = null;
    }
    this.#connected = false;
    this.#rejectAll(new Error('Probe disconnected'));
    this.emit('status', { connected: false, url: this.#url });
  }

  /**
   * @param {string} method
   * @param {Record<string, unknown>} [params]
   */
  request(method, params = {}) {
    if (!this.#socket || this.#socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Probe is not connected'));
    }

    const id = randomUUID();
    const payload = createRequest(id, method, params);

    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify(payload));
    });
  }

  /**
   * @param {string} raw
   */
  #handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    if (message.kind === MessageKind.RESPONSE) {
      const pending = this.#pending.get(message.id);
      if (!pending) {
        return;
      }
      this.#pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? 'Probe request failed'));
        return;
      }
      pending.resolve(message.result);
      return;
    }

    if (message.kind === MessageKind.EVENT) {
      this.emit('event', message);
      if (message.type === EventType.NETWORK_EVENT) {
        this.emit('network', message.payload);
      }
      if (message.type === EventType.PERF_SAMPLE) {
        this.emit('perf', message.payload);
      }
      if (message.type === EventType.DEVICE_INFO) {
        this.emit('device', message.payload);
      }
    }
  }

  /**
   * @param {Error} error
   */
  #rejectAll(error) {
    for (const pending of this.#pending.values()) {
      pending.reject(error);
    }
    this.#pending.clear();
  }
}
