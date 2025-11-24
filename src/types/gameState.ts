import { Games } from "./games.js";
import { Participants } from "./participants.js";
import {Users} from "./users.js";

export type GameState = {
    gameID?: keyof Games
    userID?: keyof Users;
    board?: Array<number>;
    currentPlayers?: Participants[];
    scores?: number;
    tilesRemaining?: number;
}