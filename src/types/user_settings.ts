import type { Users } from "./users.js";

export type UserSettings = {
  user_ID?: keyof Users;
  preferences?: JSON;
  updated_at?: Date;
};
