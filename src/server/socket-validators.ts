import { z } from "zod";

export const TileSchema = z.object({
  letter: z.string().min(1).max(1),
  value: z.number().int().nonnegative(),
  x: z.number().int().min(0).optional(),
  y: z.number().int().min(0).optional(),
  isPlaced: z.boolean().optional(),
  locked: z.boolean().optional(),
});

export const PlacedTileSchema = z.object({
  letter: z.string().min(1).max(1),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const SelectedTileSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  letter: z.string().min(1).max(1),
});


export const JoinGameSchema = z.object({
  userId: z.string().min(1),
  gameId: z.string().min(1),
});

export const JoinGameLobbySchema = z.object({
  gameId: z.string().min(1),
});

export const MakeMoveSchema = z.object({
  gameId: z.string().min(1),
  tiles: z.array(TileSchema).min(1),
  words: z.array(z.string().min(1)).min(1),
  score: z.number().int().nonnegative(),
});

export const PassTurnSchema = z.object({
  gameId: z.string().min(1),
  userId: z.string().min(1),
});

export const ExchangeTilesSchema = z.object({
  gameId: z.string().min(1),
  tiles: z.array(z.string().min(1)).min(1),
});

export const SendMessageSchema = z.object({
  id: z.number().optional(),
  game_ID: z.union([z.string().min(1), z.null()]).optional(),
  user_ID: z.string().optional(),
  message: z.string().min(1).max(2000).optional(),
  created_at: z.string().optional(),
  display_name: z.string().optional(),
});

export const AppUserSchema = z.object({
  id: z.string().optional(),
  display_name: z.string().optional(),
  email: z.string().email().optional(),
});

export const UsersSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  password_hash: z.string().optional(),
  display_name: z.string().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const CurrentPlayerDataSchema = z.object({
  game_ID: z.string().optional(),
  user_ID: z.string().optional(),
});

export const GameParticipantSchema = z.object({
  game_ID: z.string().optional(),
  is_host: z.boolean().optional(),
  user_ID: z.string().optional(),
  display_name: z.string().optional(),
});

export const ParticipantsSchema = z.object({
  playerID: z.string().optional(),
  role: z.string().optional(),
  team: z.string().optional(),
  is_host: z.boolean().optional(),
  joined_at: z.date().optional(),
});

export const GameStateResponseSchema = z.object({
  board: z.array(z.array(TileSchema.nullable())),
  hand: z.array(TileSchema),
  currentPlayer: z.string(),
  tilesRemaining: z.number().int().nonnegative(),
  scores: z.record(z.string(), z.number()),
  gameOver: z.boolean().optional(),
  winner: z.string().optional(),
});

export const MoveMadeResponseSchema = z.object({
  gameState: GameStateResponseSchema,
  userId: z.string(),
  tiles: z.array(TileSchema),
  words: z.array(z.string()),
  score: z.number().int(),
  currentPlayer: z.string(),
});

export const NewTilesResponseSchema = z.object({
  tiles: z.array(TileSchema),
});

export const TurnPassedResponseSchema = z.object({
  currentPlayer: z.string(),
  userId: z.string(),
});

export const GameOverResponseSchema = z.object({
  winner: z.string(),
  finalScores: z.record(z.string(), z.number()),
  gameId: z.string(),
  isOver: z.boolean(),
});

export const ErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

export const ScoreEntrySchema = z.object({
  game_ID: z.string(),
  user_ID: z.string(),
  value: z.number().int(),
});

export const ScoresSchema = z.object({
  gameID: z.string(),
  userID: z.string(),
  value: z.number().int(),
  recorded_at: z.date(),
});

export const GameSummaryResponseSchema = z.object({
  game_ID: z.string(),
  game_participants: z.array(GameParticipantSchema),
  scores: z.array(ScoreEntrySchema),
});


export const ChatMessageSchema = z.object({
  id: z.number(),
  game_ID: z.union([z.string(), z.null()]),
  user_ID: z.string(),
  message: z.string(),
  created_at: z.string(),
  display_name: z.string(),
});

export const NewMessageResponseSchema = z.object({
  id: z.number().optional(),
  game_ID: z.union([z.string(), z.null()]).optional(),
  user_ID: z.string().optional(),
  message: z.string().optional(),
  created_at: z.string().optional(),
  display_name: z.string().optional(),
});

export const PlayerJoinedLobbySchema = z.object({
  userId: z.string(),
  isHost: z.boolean(),
});

export const PlayerLeftLobbySchema = z.object({
  userId: z.string(),
  isHost: z.boolean(),
});

export const GameStartedSchema = z.object({
  gameId: z.string(),
});


export const GamesSchema = z.object({
  created_at: z.date().optional(),
  created_by: z.string().optional(),
  ended_at: z.date().optional(),
  gameState: z.any().optional(), // JSON
  id: z.string().optional(),
  max_players: z.number().int().positive(),
  user_settings: z.any().optional(), // JSON
  started_at: z.date().optional(),
  type: z.string().optional(),
});

export const UserSettingsSchema = z.object({
  userID: z.string().optional(),
  preferences: z.any().optional(), // JSON
  updated_at: z.date().optional(),
});

export const MovesSchema = z.object({
  id: z.string(),
  turn_number: z.number().int().optional(),
  max_turn: z.number().int().optional(),
  payload: z.any().optional(), // JSON
  created_at: z.date().optional(),
});

export const GameStateSchema = z.object({
  gameID: z.string().optional(),
  userID: z.string().optional(),
  board: z.array(z.number()).optional(),
  currentPlayers: z.array(ParticipantsSchema).optional(),
  scores: z.number().optional(),
  tilesRemaining: z.number().int().nonnegative().optional(),
});

export const ClientChatMessageSchema = z.object({
  id: z.number(),
  game_ID: z.union([z.string(), z.null()]),
  user_ID: z.string(),
  message: z.string(),
  created_at: z.string(),
  display_name: z.string(),
});

export const ClientUsersSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  email: z.string().email(),
});

export const ClientGameStateSchema = z.object({
  board: z.array(z.array(TileSchema.nullable())),
  hand: z.array(TileSchema),
  currentPlayer: z.string(),
  tilesRemaining: z.number().int().nonnegative(),
  scores: z.record(z.string(), z.number()),
  gameOver: z.boolean().optional(),
  winner: z.string().optional(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const AppSessionSchema = z.object({
  userId: z.string().optional(),
  user: AppUserSchema.nullable().optional(),
}).catchall(z.unknown());


// Client to Server
export type JoinGameData = z.infer<typeof JoinGameSchema>;
export type JoinGameLobbyData = z.infer<typeof JoinGameLobbySchema>;
export type MakeMoveData = z.infer<typeof MakeMoveSchema>;
export type PassTurnData = z.infer<typeof PassTurnSchema>;
export type ExchangeTilesData = z.infer<typeof ExchangeTilesSchema>;
export type SendMessageData = z.infer<typeof SendMessageSchema>;

// Tile Types
export type PlacedTile = z.infer<typeof PlacedTileSchema>;
export type SelectedTile = z.infer<typeof SelectedTileSchema>;
export type Tile = z.infer<typeof TileSchema>;

// User & Participant Types
export type AppUser = z.infer<typeof AppUserSchema>;
export type Users = z.infer<typeof UsersSchema>;
export type CurrentPlayerData = z.infer<typeof CurrentPlayerDataSchema>;
export type GameParticipant = z.infer<typeof GameParticipantSchema>;
export type Participants = z.infer<typeof ParticipantsSchema>;

// Server to Client Response Types
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;
export type MoveMadeResponse = z.infer<typeof MoveMadeResponseSchema>;
export type NewTilesResponse = z.infer<typeof NewTilesResponseSchema>;
export type TurnPassedResponse = z.infer<typeof TurnPassedResponseSchema>;
export type GameOverResponse = z.infer<typeof GameOverResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Score Types
export type ScoreEntry = z.infer<typeof ScoreEntrySchema>;
export type Scores = z.infer<typeof ScoresSchema>;
export type GameSummaryResponse = z.infer<typeof GameSummaryResponseSchema>;

// Chat Types
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type NewMessageResponse = z.infer<typeof NewMessageResponseSchema>;

// Lobby Event Types
export type PlayerJoinedLobbyData = z.infer<typeof PlayerJoinedLobbySchema>;
export type PlayerLeftLobbyData = z.infer<typeof PlayerLeftLobbySchema>;
export type GameStartedData = z.infer<typeof GameStartedSchema>;

// Database Table Types
export type Games = z.infer<typeof GamesSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type Moves = z.infer<typeof MovesSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

// Client-side Types
export type ClientChatMessage = z.infer<typeof ClientChatMessageSchema>;
export type ClientUsers = z.infer<typeof ClientUsersSchema>;
export type ClientGameState = z.infer<typeof ClientGameStateSchema>;
export type ApiResponse<T = any> = Omit<z.infer<typeof ApiResponseSchema>, 'data'> & { data?: T };

// Session Types
export type AppSession = z.infer<typeof AppSessionSchema>;

export function validateOrEmitError<T extends z.ZodTypeAny>(
  socket: any,
  schema: T,
  payload: unknown,
  code = "INVALID_PAYLOAD",
): z.infer<T> | null {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    try {
      socket.emit("error", {
        message: "Invalid payload",
        code,
        details: parsed.error.format(),
      });
    } catch (e) {
      console.error("Failed to emit validation error to socket", e);
    }
    return null;
  }
  return parsed.data;
}

export function validateAndRun<T extends z.ZodTypeAny>(
  socket: any,
  schema: T,
  payload: unknown,
  handler: (data: z.infer<T>) => void,
  code = "INVALID_PAYLOAD",
): void {
  const data = validateOrEmitError(socket, schema, payload, code);
  if (!data) return;
  
  try {
    handler(data);
  } catch (err) {
    try {
      socket.emit("error", { message: "Handler error", code: "HANDLER_ERROR" });
    } catch {
      // noop
    }
    console.error("Socket handler error:", err);
  }
}

export function redactPII(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  
  const obj = { ...(payload as Record<string, unknown>) };
  const keysToRedact = [
    "email",
    "password",
    "password_hash",
    "displayName",
    "display_name",
    "user_ID",
    "user_id",
    "userID",
    "userId",
  ];
  
  for (const k of keysToRedact) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      (obj as any)[k] = "[REDACTED]";
    }
  }
  
  return obj;
}

export default {
  // Client to Server Schemas
  JoinGameSchema,
  JoinGameLobbySchema,
  MakeMoveSchema,
  PassTurnSchema,
  ExchangeTilesSchema,
  SendMessageSchema,
  
  // Tile Schemas
  PlacedTileSchema,
  SelectedTileSchema,
  TileSchema,
  
  // User & Participant Schemas
  AppUserSchema,
  UsersSchema,
  CurrentPlayerDataSchema,
  GameParticipantSchema,
  ParticipantsSchema,
  
  // Server to Client Response Schemas
  GameStateResponseSchema,
  MoveMadeResponseSchema,
  NewTilesResponseSchema,
  TurnPassedResponseSchema,
  GameOverResponseSchema,
  ErrorResponseSchema,
  
  // Score Schemas
  ScoreEntrySchema,
  ScoresSchema,
  GameSummaryResponseSchema,
  
  // Chat Schemas
  ChatMessageSchema,
  NewMessageResponseSchema,
  
  // Lobby Event Schemas
  PlayerJoinedLobbySchema,
  PlayerLeftLobbySchema,
  GameStartedSchema,
  
  // Database Schemas
  GamesSchema,
  UserSettingsSchema,
  MovesSchema,
  GameStateSchema,
  
  // Client-side Schemas
  ClientChatMessageSchema,
  ClientUsersSchema,
  ClientGameStateSchema,
  ApiResponseSchema,
  
  // Session Schemas
  AppSessionSchema,
  
  // Helper Functions
  validateOrEmitError,
  validateAndRun,
  redactPII,
};
