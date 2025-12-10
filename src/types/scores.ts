import type { Users } from "./users.ts";

export interface Scores {
  userID: keyof Users;
  value: number;
  recorded_at: Date;
}
