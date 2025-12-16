import { Users } from "./users.js";

export type Participants = {
  playerID?: keyof Users;
  role?: string;
  team?: string;
  is_host?: boolean;
  joined_at?: Date;
};
