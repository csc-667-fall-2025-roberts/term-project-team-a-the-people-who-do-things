import { Users } from "./users.js";

export interface UserSettings {
  userID?: keyof Users;
  preferences?: JSON;
  updated_at?: Date;
}
