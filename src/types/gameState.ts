import type { Games } from "./games.js";
import type { Participants } from "./participants.js";
import type { Users } from "./users.js";

export type GameState = {
  gameID?: keyof Games;
  userID?: keyof Users;
  board?: number[];
  currentPlayers?: Participants[];
  scores?: number;
  tilesRemaining?: number;
};
