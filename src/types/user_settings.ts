import { Users } from "./users.js";

export type UserSettings = {
  userID?: keyof Users;
  preferences?: JSON;
  updated_at?: Date;
};
