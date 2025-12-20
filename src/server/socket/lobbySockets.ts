import type { Server, Socket } from "socket.io";

import pool from "../config/database.js";
import { JoinGameLobbySchema, validateOrEmitError } from "./validators.js";

export function registerLobbySockets(
  io: Server,
  socket: Socket,
  userId: string,
  displayName: string,
) {
  socket.on("join-lobby", () => {
    socket.join("lobby");
  });

  socket.on("leave-lobby", () => {
    socket.leave("lobby");
  });

  socket.on("join-game-lobby", (payload) => {
    const data = validateOrEmitError(socket, JoinGameLobbySchema, payload);
    if (!data) return;
    const { gameId } = data;

    socket.join(gameId);

    socket.to(gameId).emit("player-joined", {
      userId,
      displayName,
      isHost: false,
    });
  });

  socket.on("leave-game-lobby", async (gameId: string) => {
    socket.leave(gameId);

    try {
      // Only treat this as "leaving the lobby" if the game has not started yet
      const gameResult = await pool.query("SELECT status, created_by FROM games WHERE id = $1", [
        gameId,
      ]);

      if (gameResult.rows.length === 0 || gameResult.rows[0].status !== "waiting") {
        console.log("Game already started or doesn't exist, not removing player");
        return;
      }

      // If the host leaves a waiting lobby, promote the next player as the new host
      const participantResult = await pool.query(
        "SELECT is_host FROM game_participants WHERE game_id = $1 AND user_id = $2",
        [gameId, userId],
      );

      const isHost = participantResult.rows.length > 0 && participantResult.rows[0].is_host;

      await pool.query("DELETE FROM game_participants WHERE game_id = $1 AND user_id = $2", [
        gameId,
        userId,
      ]);
      console.log("Removed player from game_participants:", userId, "gameId:", gameId);

      if (isHost) {
        const nextHostResult = await pool.query(
          "SELECT user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at ASC LIMIT 1",
          [gameId],
        );

        if (nextHostResult.rows.length > 0) {
          const newHostId = nextHostResult.rows[0].user_id;
          console.log(`Host left. Promoting user ${newHostId} to host.`);

          await pool.query(
            "UPDATE game_participants SET is_host = true WHERE game_id = $1 AND user_id = $2",
            [gameId, newHostId],
          );

          await pool.query("UPDATE games SET created_by = $1 WHERE id = $2", [newHostId, gameId]);
        }
      }

      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM game_participants WHERE game_id = $1",
        [gameId],
      );
      const playerCount = parseInt(countResult.rows[0].count);

      socket.to(gameId).emit("player-left-lobby", { userId, playerCount });

      io.to("lobby").emit("lobby-updated");

      if (playerCount === 0) {
        await pool.query("DELETE FROM games WHERE id = $1", [gameId]);
        console.log("Deleted empty game:", gameId);
      }
    } catch (error) {
      console.error("Error removing player from game:", error);
    }
  });
}
