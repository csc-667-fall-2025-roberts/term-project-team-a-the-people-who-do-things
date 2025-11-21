type Listener = (...args: unknown[]) => void;

export class SocketManager {
  private readonly socket: any;
  private readonly listeners = new Map<string, Listener[]>();

  constructor() {
    if (typeof io === "undefined") {
      throw new Error(
        'Socket.IO client library not loaded. Include <script src="/socket.io/socket.io.js"></script> before this script.',
      );
    }
    this.socket = io();
  }

  on(event: string, callback: Listener) {
    this.socket.on(event, callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  emit(event: string, data?: unknown) {
    this.socket.emit(event, data);
  }

  off(event: string, callback: Listener) {
    this.socket.off(event, callback);

    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  removeAllListeners(event: string) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      this.socket.off(event, callback);
    });
    this.listeners.delete(event);
  }
}

export const socket = new SocketManager();


