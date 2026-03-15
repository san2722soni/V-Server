import crypto from "crypto";
import redisClient from "../../db/redis.js";
import Game from "../../model/Game.js";
import LogModule from "../../service/log/index.js";
import { MATCH_MAKING_LIMIT } from "../../constants/index.js";

const client = redisClient.client;
const QUEUE_KEY = "matchmaking_queue";

// Generate Secret function
const generateSecret = (length = 16) => {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
};

const findAMatch = async ({ userData }) => {
  try {
    LogModule.log({
      key1: "findAMatch",
      key2: "start",
      text1: "Matchmaking process started",
      text2: `User ID: ${userData.userId}`,
    });

    // Check if player is already in an active game
    const keys = await client.keys("currentGame:*");
    for (const key of keys) {
      const gameData = JSON.parse(await client.get(key));
      if (gameData.players.some((p) => p.userId === userData.userId)) {
        LogModule.log({
          key1: "findAMatch",
          key2: "already_in_game",
          text1: "Player already in active game",
          text2: `User ID: ${userData.userId}, Game ID: ${gameData.gameId}`,
        });
        return {
          matchFound: false,
          message: "Player is already in an active game",
          gameId: gameData.gameId,
        };
      }
    }

    // Check if player is already in the queue
    const isInQueue = await client.lPos(QUEUE_KEY, userData.userId);
    if (isInQueue !== null) {
      LogModule.log({
        key1: "findAMatch",
        key2: "already_in_queue",
        text1: "Player already in queue",
        text2: `User ID: ${userData.userId}`,
      });
      return {
        matchFound: false,
        message: "Player is already in the queue",
      };
    }

    // Add player to the queue
    await client.rPush(QUEUE_KEY, userData.userId);

    // Hearbeat init
    await client.set(`lastActive:${userData.userId}`, Date.now(), { EX: 120 });

    // Get current queue
    const players = await client.lRange(QUEUE_KEY, 0, -1);

    // If enough players creating a game
    if (players.length >= MATCH_MAKING_LIMIT) {
      const group = players.slice(0, MATCH_MAKING_LIMIT);

      const newGame = await Game.create({
        saltKey: generateSecret(16),
        players: group.map((playerId, index) => ({
          userId: playerId,
          secret: generateSecret(16),
          characterId: "",
          clientId: index + 1,
        })),
        serverIP: "127.0.0.1", // server IP hardcoded for now
      });

      if (!newGame) {
        throw new Error("Error creating new game");
      }

      // 6: Remove players from the queue
      for (const playerId of group) {
        await client.lRem(QUEUE_KEY, 1, playerId);
      }

      // Store current game in redis currentGame cache
      await client.set(
        `currentGame:${newGame._id.toString()}`,
        JSON.stringify({
          gameId: newGame._id.toString(),
          saltKey: newGame.saltKey,
          players: newGame.players,
        })
      );

      LogModule.log({
        key1: "findAMatch",
        key2: "match_found",
        text1: "Match found and game created",
        text2: `Game ID: ${newGame._id}, Players: ${group.length}`,
      });

      return {
        matchFound: true,
        game: newGame,
      };
    }

    // else wait in queue
    LogModule.log({
      key1: "findAMatch",
      key2: "in_queue",
      text1: "Player added to queue",
      text2: `User ID: ${userData.userId}, Queue length: ${players.length}`,
    });

    return {
      matchFound: false,
      message: "Player added to queue",
      queueLength: players.length,
    };
  } catch (error) {
    LogModule.error({
      key1: "findAMatch",
      key2: "failed",
      text1: "Matchmaking failed",
      text2: `User ID: ${userData.userId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getStatus = async ({ userData }) => {
  try {
    LogModule.log({
      key1: "getStatus",
      key2: "start",
      text1: "Getting match status",
      text2: `User ID: ${userData.userId}`,
    });

    // keep alive
    await client.set(`lastActive:${userData.userId}`, Date.now(), { EX: 120 });

    // Check in redis currentGame cache
    const keys = await client.keys("currentGame:*");

    for (const key of keys) {
      const gameData = JSON.parse(await client.get(key));

      const player = gameData.players.find((p) => p.userId === userData.userId);
      if (player) {
        LogModule.log({
          key1: "getStatus",
          key2: "in_game",
          text1: "Player found in active game",
          text2: `User ID: ${userData.userId}, Game ID: ${gameData.gameId}`,
        });
        return {
          inGame: true,
          gameId: gameData.gameId,
          playerId: userData.userId,
          secretKey: player.secret,
          saltKey: gameData.saltKey,
          clientId: player.clientId,
        };
      }
    }

    const isInQueue = await client.lPos(QUEUE_KEY, userData.userId);

    LogModule.log({
      key1: "getStatus",
      key2: "status_checked",
      text1: "Player status checked",
      text2: `User ID: ${userData.userId}, In queue: ${isInQueue !== null}`,
    });

    return {
      inGame: false,
      inQueue: isInQueue !== null,
    };
  } catch (error) {
    LogModule.error({
      key1: "getStatus",
      key2: "failed",
      text1: "Failed to get match status",
      text2: `User ID: ${userData.userId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const cancelSearch = async ({ userData }) => {
  try {
    LogModule.log({
      key1: "cancelSearch",
      key2: "start",
      text1: "Cancelling match search",
      text2: `User ID: ${userData.userId}`,
    });

    // Remove player from the queue
    const removeCount = await client.lRem(QUEUE_KEY, 0, userData.userId);

    LogModule.log({
      key1: "cancelSearch",
      key2: "success",
      text1: "Match search cancelled",
      text2: `User ID: ${userData.userId}, Removed: ${removeCount > 0}`,
    });

    return {
      remove: removeCount > 0,
    };
  } catch (error) {
    LogModule.error({
      key1: "cancelSearch",
      key2: "failed",
      text1: "Failed to cancel match search",
      text2: `User ID: ${userData.userId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default {
  findAMatch,
  cancelSearch,
  getStatus,
};
