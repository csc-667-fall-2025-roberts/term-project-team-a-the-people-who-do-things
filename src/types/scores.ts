import type { Users } from "./users.ts";

export type Scores = {
  user_ID: keyof Users;
  value: number;
  recorded_at: Date;
};
