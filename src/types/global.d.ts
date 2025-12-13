export declare const io: any; --no ignoe // Socket.IO global 

// Window object extensions
declare global {
  interface Window {
    GAME_ID: string;
    USER_ID?: string;
    DISPLAY_NAME?: string;
  }
}

export {};
