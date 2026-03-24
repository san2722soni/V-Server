import mongoose from "mongoose";
import redisClient from "../../db/redis.js";
import LogModule from "../../service/log/index.js";

const client = redisClient.client;

async function Kill({ id, userId }) {
  try {
    LogModule.log({
      key1: "killPlayer",
      key2: "start",
      text1: "Player kill process started",
      text2: `Player ID: ${userId}, Game ID: ${id}`,
    });

    if (!id) throw new Error("Please provide a player id");

    if (!userId) throw new Error("Please provide user id");

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      throw new Error("Incorrect id format of id or userId");
    }

    // Look for this user inside all current Game caches
    const keys = await client.keys("currentGame:*");

    for (const key of keys) {
      const gameData = JSON.parse(await client.get(key));

      // check if the player exists in this game
      const playerIndex = gameData.players.findIndex(
        (p) => String(p.userId) === String(userId)
      );

      if (playerIndex !== -1) {
        // Remove the player from the game
        gameData.players.splice(playerIndex, 1);

        // Update the game cache
        await client.set(key, JSON.stringify(gameData));

        // If no players left, delete the game cache
        if (gameData.players.length === 0) {
          await client.del(key);
        }

        LogModule.log({
          key1: "killPlayer",
          key2: "success",
          text1: "Player removed from game successfully",
          text2: `Player ID: ${userId}, Game ID: ${gameData.gameId}`,
        });

        return {
          success: true,
          message: `Player ${userId} removed from game ${gameData.gameId}`,
        };
      }
    }

    // player not found in any game
    LogModule.log({
      key1: "killPlayer",
      key2: "not_found",
      text1: "Player not found in any active game",
      text2: `Player ID: ${userId}`,
    });

    return {
      success: false,
      message: "Player not found in any active game",
    };
  } catch (error) {
    LogModule.error({
      key1: "killPlayer",
      key2: "failed",
      text1: "Player kill process failed",
      text2: `Player ID: ${userId}, Game ID: ${id}`,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export default {
  Kill,
};
