CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_turn_user_id UUID REFERENCES users(id),
  game_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  max_players INT DEFAULT 2,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE TABLE game_participants (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  turn_order INT,
  role VARCHAR(30) DEFAULT 'player',
  team VARCHAR(30),
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (game_id, user_id)
);

CREATE TABLE board_tiles (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  row INT NOT NULL CHECK (row BETWEEN 0 AND 14),
  col INT NOT NULL CHECK (col BETWEEN 0 AND 14),
  letter CHAR(1) NOT NULL,
  placed_by UUID NOT NULL REFERENCES users(id),
  placed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (game_id, row, col)
);

CREATE TABLE player_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  letter CHAR(1) NOT NULL,
  FOREIGN KEY (game_id, user_id) REFERENCES game_participants(game_id, user_id) ON DELETE CASCADE
);

CREATE TABLE tile_bag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  letter CHAR(1) NOT NULL
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  turn_number INT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value INT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_id, user_id)
);

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX idx_chat_messages_game_created ON chat_messages(game_id, created_at);
CREATE INDEX idx_chat_messages_lobby ON chat_messages(created_at) WHERE game_id IS NULL;
CREATE INDEX idx_moves_game_turn ON moves(game_id, turn_number);
CREATE INDEX idx_scores_game_user ON scores(game_id, user_id);
CREATE INDEX idx_user_sessions_expire ON user_sessions(expire);
CREATE INDEX idx_board_tiles_game ON board_tiles(game_id);
CREATE INDEX idx_player_tiles_game_user ON player_tiles(game_id, user_id);
CREATE INDEX idx_tile_bag_game ON tile_bag(game_id);
