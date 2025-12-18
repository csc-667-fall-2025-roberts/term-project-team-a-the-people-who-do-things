import type { Users } from "./users.js";

export type Participants = {
  player_ID?: keyof Users;
  role?: string;
  team?: string;
  is_host?: boolean;
  joined_at?: Date;
};
