import { z } from "zod";


export const PlacedTileSchema = z.object({
  letter: z.string().min(1).max(1), // single letter
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const SelectedTileSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  letter: z.string().min(1).max(1),
});

export const PlacedTilesArray = z.array(PlacedTileSchema);

export const JoinGameSchema = z.object({
  gameId: z.string().min(1),
});

// Lobby join/leave
export const JoinGameLobbySchema = z.object({
  gameId: z.string().min(1),
});

export const MakeMoveSchema = z.object({
  gameId: z.string().min(1),
  tiles: PlacedTilesArray.min(1),
  words: z.array(z.string().min(1)).min(1),
  score: z.number().int().nonnegative().optional(),
});

// Pass turn
export const PassTurnSchema = z.object({
  gameId: z.string().min(1),
});

// Exchange tiles
export const ExchangeTilesSchema = z.object({
  gameId: z.string().min(1),
  tiles: z.array(z.string().min(1)).min(1),
});

export const SendMessageSchema = z.object({
  gameId: z.union([z.string().min(1), z.null()]),
  message: z.string().min(1).max(2000),
});

export type JoinGameData = z.infer<typeof JoinGameSchema>;
export type JoinGameLobbyData = z.infer<typeof JoinGameLobbySchema>;
export type MakeMoveData = z.infer<typeof MakeMoveSchema>;
export type PassTurnData = z.infer<typeof PassTurnSchema>;
export type ExchangeTilesData = z.infer<typeof ExchangeTilesSchema>;
export type SendMessageData = z.infer<typeof SendMessageSchema>;
export type PlacedTile = z.infer<typeof PlacedTileSchema>;
export type SelectedTile = z.infer<typeof SelectedTileSchema>;

export function validateOrEmitError<T extends z.ZodTypeAny>(
  socket: any,
  schema: T,
  payload: unknown,
  code = "INVALID_PAYLOAD",
) {
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
  return parsed.data as z.infer<T>;
}

export function validateAndRun<T extends z.ZodTypeAny>(
  socket: any,
  schema: T,
  payload: unknown,
  handler: (data: z.infer<T>) => void,
  code = "INVALID_PAYLOAD",
) {
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
    "user_id",
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
  // schemas
  JoinGameSchema,
  JoinGameLobbySchema,
  MakeMoveSchema,
  PassTurnSchema,
  ExchangeTilesSchema,
  SendMessageSchema,
  PlacedTileSchema,
  SelectedTileSchema,
  // helpers
  validateOrEmitError,
  validateAndRun,
  redactPII,
};
