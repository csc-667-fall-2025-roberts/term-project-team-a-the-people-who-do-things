declare const io: {
  (
    url?: string,
    options?: Record<string, unknown>,
  ): {
    emit(event: string, ...args: unknown[]): void;
    on(event: string, handler: (data: unknown) => void): void;
    off(event: string, handler?: (data: unknown) => void): void;
    removeAllListeners(event?: string): void;
  };
  Manager?: any;
  Socket?: any;
};
