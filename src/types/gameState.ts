import {User} from "./user.ts";

export type GameState = {
    board?: Array<number>;
    currentPlayer: keyof User;
    scores: number;
    tilesRemaining: number;
}