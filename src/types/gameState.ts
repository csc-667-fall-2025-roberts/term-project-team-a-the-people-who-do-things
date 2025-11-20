import { Games } from "./games.ts";
import { Participants } from "./participants.ts";
import {Users} from "./users.ts";

export type GameState = {
    gameID?: keyof Games
    userID?: keyof Users;
    board?: Array<number>;
    currentPlayers?: Participants[];
    scores?: number;
    tilesRemaining?: number;
}