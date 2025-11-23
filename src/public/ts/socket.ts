import io from "socket.io-client";

type Listener = (...args: unknown[]) => void;

class SocketManager {
  private readonly socket: ReturnType<typeof io>;
  private readonly listeners = new Map<string, Listener[]>();

  constructor() {
    this.socket = io();
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    this.socket.on(event, callback);
  }

  emit(event: string, data?: unknown) {
    this.socket.emit(event, data);
  }

  off(event: string, callback: Listener) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    this.socket.off(event, callback);
  }

  removeAllListeners(event: string) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      this.socket.off(event, callback);
    });
    this.listeners.delete(event);
  }

  disconnect() {
    this.socket.disconnect();
    this.listeners.clear();
  }
}

export default SocketManager;

export const socket = new SocketManager();
