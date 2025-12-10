import type { SocketEvents } from "../../types/client/socket-events.js";

export class SocketManager {
  socket: {
    emit(event: string, ...args: unknown[]): void;
    on(event: string, handler: (data: unknown) => void): void;
    off(event: string, handler?: (data: unknown) => void): void;
    removeAllListeners(event?: string): void;
  };
  listeners: Map<string, ((data: unknown) => void)[]>;

  constructor() {
    if (typeof io === "undefined") {
      throw new Error("Socket");
    }
    this.socket = io();
    this.listeners = new Map();
  }

  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void;
  on(event: string, callback: (data: unknown) => void): void;
  on(event: string, callback: (data: any) => void): void {
    this.socket.on(event, callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit<K extends keyof SocketEvents>(event: K, data?: SocketEvents[K]): void;
  emit(event: string, data?: any): void;
  emit(event: string, data?: any): void {
    if (typeof data !== "undefined") {
      this.socket.emit(event, data);
    } else {
      this.socket.emit(event);
    }
  }

  off(event: string, callback: (data: unknown) => void): void {
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
          callbacks.forEach((callback) => {
              this.socket.off(event, callback);
          });
          this.listeners.delete(event);
      }
  }

}

// Export a singleton instance
export const socket = new SocketManager();
