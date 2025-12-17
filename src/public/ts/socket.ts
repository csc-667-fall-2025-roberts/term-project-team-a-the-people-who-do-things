import { io as clientIo } from "socket.io-client";

import type { SocketEvents } from "../../types/client/socket-events.js";

export class SocketManager {
  socket: {
    emit<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void;
    emit<K extends keyof SocketEvents>(event: K): void;

    on<K extends keyof SocketEvents>(event: K, handler: (data: SocketEvents[K]) => void): void;

    off<K extends keyof SocketEvents>(event: K, handler?: (data: SocketEvents[K]) => void): void;

    removeAllListeners(event?: keyof SocketEvents): void;
  };
  listeners: Map<string, ((data: unknown) => void)[]>;

  constructor() {
    this.socket = clientIo() as any;
    this.listeners = new Map();
  }

  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void;
  on(event: string, callback: (data: unknown) => void): void;
  on(event: string, callback: (data: any) => void): void {
    this.socket.on(event as any, callback as any);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit<K extends keyof SocketEvents>(event: K, data?: SocketEvents[K]): void;
  emit(event: string, data?: any): void;
  emit(event: string, data?: any): void {
    const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

    const hasPII = (obj: unknown): boolean => {
      if (!isObject(obj)) return false;
      const keys = [
        "email",
        "password",
        "password_hash",
        "displayName",
        "display_name",
        "user_id",
        "userId",
        "ssn",
        "phone",
        "dob",
      ];
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) return true;
      }
      return false;
    };

    const redact = (obj: unknown): unknown => {
      if (!isObject(obj)) return obj;
      const out = { ...(obj as Record<string, unknown>) };
      const keys = [
        "email",
        "password",
        "password_hash",
        "displayName",
        "display_name",
        "user_id",
        "userId",
        "ssn",
        "phone",
        "dob",
      ];
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(out, k)) {
          out[k] = "[REDACTED]";
        }
      }
      return out;
    };

    const isProd =
      typeof process !== "undefined" &&
      typeof process.env === "object" &&
      process.env &&
      process.env.NODE_ENV === "production";

    const getProdBehavior = (): "log" | "redact" | "block" => {
      if (typeof process === "undefined" || typeof process.env !== "object" || !process.env) {
        return "log";
      }
      const raw = process.env.SOCKET_PII_PRODUCTION_BEHAVIOR;
      if (!raw) return "log";
      const v = String(raw).toLowerCase();
      if (v === "redact") return "redact";
      if (v === "block") return "block";
      return "log";
    };

    if (typeof data === "undefined") {
      this.socket.emit(event as any);
      return;
    }

    if (!hasPII(data)) {
      this.socket.emit(event as any, data);
      return;
    }

    // Payload has PII
    if (!isProd) {
      console.warn(
        `[SocketManager] Blocking emit of event "${event}" because payload appears to contain PII keys (development).`,
      );
      return;
    }

    switch (getProdBehavior()) {
      case "redact": {
        const safe = redact(data);
        console.warn(`[SocketManager] Emitting event "${event}" with PII redacted (production).`);
        try {
          this.socket.emit(event as any, safe);
        } catch (e) {
          console.warn("[SocketManager] Failed to emit event after redaction:", e);
        }
        return;
      }
      case "block": {
        console.warn(
          `[SocketManager] Blocking emit of event "${event}" in production due to configured PII policy.`,
        );
        return;
      }
      case "log":
      default: {
        console.warn(
          `[SocketManager] PII detected in payload for event "${event}" (production). Emitting original payload per configuration.`,
        );
        this.socket.emit(event as any, data);
        return;
      }
    }
  }

  // typed off signature
  off<K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void): void;
  off(event: string, callback: (data: unknown) => void): void {
    this.socket.off(event as any, callback as any);
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback as any);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  removeAllListeners(event: keyof SocketEvents | string): void {
    const key = String(event);
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key)!;
      callbacks.forEach((callback) => {
        this.socket.off(key as any, callback as any);
      });
      this.listeners.delete(key);
    } else {
      if (typeof this.socket.removeAllListeners === "function") {
        this.socket.removeAllListeners(event as any);
      }
    }
  }
}

// Export a singleton instance
export const socket = new SocketManager();
