export type Games = {
    id?: string;
    type?: string;
    state?: string;
    max_players: number;
    settings?: JSON;
    created_by?: string;
    created_at?: Date;
    started_at?: Date;
    ended_at?: Date;
}