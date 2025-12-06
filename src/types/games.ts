export type Games = {
  created_at?: Date;
  created_by?: string;
  ended_at?: Date;
  gameState?: JSON;
  id?: string;
  max_players: number;
  user_settings?: JSON;
  started_at?: Date;
  type?: string;
};
