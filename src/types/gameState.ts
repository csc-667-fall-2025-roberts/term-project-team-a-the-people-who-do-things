import {Users} from "./users.ts";

export type GameState = {
    board?: Array<number>;
    currentPlayer?: keyof Users;
    scores?: number;
    tilesRemaining?: number;
}