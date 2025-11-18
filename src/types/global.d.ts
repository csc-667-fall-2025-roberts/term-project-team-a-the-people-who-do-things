// Socket.IO global
declare const io: any;

// Window object extensions
declare global {
  interface Window {
    GAME_ID: string;
    USER_ID?: string;
    DISPLAY_NAME?: string;
  }
}

export {};
