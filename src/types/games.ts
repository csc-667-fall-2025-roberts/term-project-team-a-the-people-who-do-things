export type Games = {
    id?: string;
    type?: string;
    state?: string;
    max_players: number;
    settings?: JSON;
    created_by?: string;
    created_at?: string;
    started_at?: string;
    ended_at?: string;
}