import type { Users } from "./users.ts";

export type Scores = {
  userID: keyof Users;
  value: number;
  recorded_at: Date;
};
