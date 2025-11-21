import type { SocketEvents } from "../../types/client/socket-events.ts";

export class SocketManager {
  socket: any;
  listeners: Map<string, Function[]>;

  constructor() {
    if (typeof io === "undefined") {
      throw new Error(
        'Sohit'
      );
    }
    this.socket = io();
    this.listeners = new Map();
  }

  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void;
  on(event: string, callback: (data: any) => void): void;
  on(event: string, callback: (data: any) => void): void {
    this.socket.on(event, callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void;
  emit(event: string, data: any): void;
  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  off(event: string, callback: Function): void {
    this.socket.off(event, callback);

    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  removeAllListeners(event: string): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      callbacks.forEach((callback: Function) => {
        this.socket.off(event, callback);
      });
      this.listeners.delete(event);
    }
  }
}

// Export a singleton instance
export const socket = new SocketManager();
