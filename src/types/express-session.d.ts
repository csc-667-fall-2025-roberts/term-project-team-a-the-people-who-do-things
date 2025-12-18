/* eslint-disable @typescript-eslint/consistent-type-definitions */
/*  noinspection JSUnusedGlobalSymbols */
/* eslint-nocheck */ 
declare module 'express-session' {
  // Add optional session fields used by the app.
  // Use an interface here to merge with the existing upstream declaration.
  interface SessionData {
    user_ID?: string;
  }
}
