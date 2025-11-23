import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Enable pgcrypto extension for UUID generation
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    display_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create games table
  pgm.createTable('games', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    current_turn_user_id: {
      type: 'uuid',
      references: 'users(id)',
    },
    game_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
    },
    max_players: {
      type: 'integer',
      default: 2,
    },
    settings_json: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    started_at: {
      type: 'timestamptz',
    },
    ended_at: {
      type: 'timestamptz',
    },
  });

  // Create game_participants table
  pgm.createTable('game_participants', {
    game_id: {
      type: 'uuid',
      notNull: true,
      references: 'games(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    score: {
      type: 'integer',
      default: 0,
    },
    turn_order: {
      type: 'integer',
    },
    role: {
      type: 'varchar(30)',
      default: "'player'",
    },
    team: {
      type: 'varchar(30)',
    },
    is_host: {
      type: 'boolean',
      default: false,
    },
    joined_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addConstraint('game_participants', 'game_participants_pkey', {
    primaryKey: ['game_id', 'user_id'],
  });

  // Create board_tiles table
  pgm.createTable('board_tiles', {
    game_id: {
      type: 'uuid',
      notNull: true,
      references: 'games(id)',
      onDelete: 'CASCADE',
    },
    row: {
      type: 'integer',
      notNull: true,
      check: 'row BETWEEN 0 AND 14',
    },
    col: {
      type: 'integer',
      notNull: true,
      check: 'col BETWEEN 0 AND 14',
    },
    letter: {
      type: 'char(1)',
      notNull: true,
    },
    placed_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
    },
    placed_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addConstraint('board_tiles', 'board_tiles_pkey', {
    primaryKey: ['game_id', 'row', 'col'],
  });

  // Create player_tiles table
  pgm.createTable('player_tiles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    game_id: {
      type: 'uuid',
      notNull: true,
      references: 'games(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    letter: {
      type: 'char(1)',
      notNull: true,
    },
  });

  pgm.addConstraint('player_tiles', 'player_tiles_game_user_fkey', {
    foreignKeys: {
      columns: ['game_id', 'user_id'],
      references: 'game_participants(game_id, user_id)',
      onDelete: 'CASCADE',
    },
  });

  // Create tile_bag table
  pgm.createTable('tile_bag', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    game_id: {
      type: 'uuid',
      notNull: true,
      references: 'games(id)',
      onDelete: 'CASCADE',
    },
    letter: {
      type: 'char(1)',
      notNull: true,
    },
  });

  // Create chat_messages table
  pgm.createTable('chat_messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    game_id: {
      type: 'uuid',
      references: 'games(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    message: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create moves table
  pgm.createTable('moves', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    game_id: {
      type: 'uuid',
      notNull: true,
      references: 'games(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    turn_number: {
      type: 'integer',
      notNull: true,
    },
    payload: {
      type: 'jsonb',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create scores table
  pgm.createTable('scores', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    game_id: {
      type: 'uuid',
      notNull: true,
      references: 'games(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    value: {
      type: 'integer',
      notNull: true,
    },
    recorded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addConstraint('scores', 'scores_game_user_unique', {
    unique: ['game_id', 'user_id'],
  });

  // Create user_settings table
  pgm.createTable('user_settings', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    preferences: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create user_sessions table
  pgm.createTable('user_sessions', {
    sid: {
      type: 'varchar',
      primaryKey: true,
    },
    sess: {
      type: 'json',
      notNull: true,
    },
    expire: {
      type: 'timestamp(6)',
      notNull: true,
    },
  });

  // Create indexes
  pgm.createIndex('game_participants', 'user_id', {
    name: 'idx_game_participants_user_id',
  });
  pgm.createIndex('game_participants', 'game_id', {
    name: 'idx_game_participants_game_id',
  });
  pgm.createIndex('chat_messages', ['game_id', 'created_at'], {
    name: 'idx_chat_messages_game_created',
  });
  pgm.createIndex('chat_messages', 'created_at', {
    name: 'idx_chat_messages_lobby',
    where: 'game_id IS NULL',
  });
  pgm.createIndex('moves', ['game_id', 'turn_number'], {
    name: 'idx_moves_game_turn',
  });
  pgm.createIndex('scores', ['game_id', 'user_id'], {
    name: 'idx_scores_game_user',
  });
  pgm.createIndex('user_sessions', 'expire', {
    name: 'idx_user_sessions_expire',
  });
  pgm.createIndex('board_tiles', 'game_id', {
    name: 'idx_board_tiles_game',
  });
  pgm.createIndex('player_tiles', ['game_id', 'user_id'], {
    name: 'idx_player_tiles_game_user',
  });
  pgm.createIndex('tile_bag', 'game_id', {
    name: 'idx_tile_bag_game',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order (respecting foreign key dependencies)
  pgm.dropTable('user_sessions');
  pgm.dropTable('user_settings');
  pgm.dropTable('scores');
  pgm.dropTable('moves');
  pgm.dropTable('chat_messages');
  pgm.dropTable('tile_bag');
  pgm.dropTable('player_tiles');
  pgm.dropTable('board_tiles');
  pgm.dropTable('game_participants');
  pgm.dropTable('games');
  pgm.dropTable('users');

  // Drop extension
  pgm.dropExtension('pgcrypto');
}
