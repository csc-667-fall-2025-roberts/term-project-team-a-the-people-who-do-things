/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* Socket.IO global (browser/runtime)
 */

declare global {
  var io: any;

  interface Window {
    GAME_ID: string;
    USER_ID?: string;
    DISPLAY_NAME?: string;
  }
}

export {};
