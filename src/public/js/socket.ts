export class SocketManager {
    socket: any;
    constructor() {
        // Use global io if available, otherwise try to import it
        if (typeof io === 'undefined') {
            throw new Error('Socket.IO client library not loaded. Make sure to include <script src="/socket.io/socket.io.js"></script> before this script.');
        }
        this.socket = io();
        this.listeners = new Map();
    }

    on(event: string, callback: any) {
        this.socket.on(event, callback);

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event: string, data: { gameId: any; tiles?: any[]; words?: string[]; score?: any; message?: any; }) {
        this.socket.emit(event, data);
    }

    off(event: string, callback: any) {
        this.socket.off(event, callback);

        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    removeAllListeners(event: string) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            callbacks.forEach((callback: any) => {
                this.socket.off(event, callback);
            });
            this.listeners.delete(event);
        }
    }
}

