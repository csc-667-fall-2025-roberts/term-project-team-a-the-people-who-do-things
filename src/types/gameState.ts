import type { Games } from "./games.js";
import type { Participants } from "./participants.js";
import type { Users } from "./users.js";

export type GameState = {
  game_ID?: keyof Games;
  user_ID?: keyof Users;
  board?: number[];
  currentPlayers?: Participants[];
  scores?: number;
  tilesRemaining?: number;
};
