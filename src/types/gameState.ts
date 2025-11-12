import {User} from "./src/types/users.ts";

export type GameState = {
    board?: Array<number>;
    currentPlayer?: keyof User;
    scores?: number;
    tilesRemaining?: number;
}