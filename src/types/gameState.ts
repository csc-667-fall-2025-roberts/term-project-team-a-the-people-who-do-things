import { Games } from "./games.js";
import { Participants } from "./participants.js";
import { Users } from "./users.js";

export interface GameState {
  gameID?: keyof Games;
  userID?: keyof Users;
  board?: number[];
  currentPlayers?: Participants[];
  scores?: number;
  tilesRemaining?: number;
}
