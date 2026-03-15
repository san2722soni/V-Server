import crypto from "crypto";
import {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import redisClient from "../../db/redis.js";
import Lobby from "../../model/Lobby.js";
import CustomGame from "../../model/CustomGame.js";
import { exec } from "child_process";
import featureFlag from "../../service/dashboard/featureFlag.js";
import Build from "../../model/Build.js";
import config from "../../constants/config.js";
import LogModule from "../../service/log/index.js";
import chooseCharacter from "./chooseCharacter.js";
import { buildTeamTree } from "./gameLogic.js";
import UserProfile from "../../model/UserProfile.js";
import Character from "../../model/Character.js";

const { MAIN_SERVER, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } =
  config;

const ec2Client = new EC2Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const client = redisClient.client;
const QUEUE_KEY = "userLobby";
const LOBBY_TTL = 7200; // 2 hours - safety net TTL for lobby Redis keys

const generateSecret = (length = 16) => {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
};

function generateLobbyId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

/* ----------------------------- HELPER: CHECK IF USER IN ACTIVE GAME ----------------------------- */
const isUserInActiveGame = async (userId) => {
  try {
    const uid = String(userId);
    const gameKeys = await client.keys("currentGame:*");
    if (gameKeys.length === 0) {
      return { inGame: false };
    }

    for (const key of gameKeys) {
      const gameRaw = await client.get(key);
      if (!gameRaw) continue;

      const gameData = JSON.parse(gameRaw);
      const playerIds = gameData.players.map((p) => String(p.userId));

      if (playerIds.includes(uid)) {
        return {
          inGame: true,
          gameId: gameData.gameId,
          lobbyId: gameData.lobbyId,
        };
      }
    }
    return { inGame: false };
  } catch (err) {
    console.error("Error checking active game:", err);
    return { inGame: false };
  }
};

/* ----------------------------- HELPER: GET CUSTOM GAME WITH USER SECRET ----------------------------- */
const getCustomGame = async (gameId, userId) => {
  try {
    const game = await CustomGame.findById(gameId);
    if (!game) {
      return null;
    }

    // Find the requesting user's player data
    const userPlayer = game.players.find(
      (p) => String(p.userId) === String(userId)
    );

    // Filter out secrets from all players
    const filteredPlayers = game.players.map((player) => {
      const { secret, ...playerWithoutSecret } = player.toObject
        ? player.toObject()
        : player;
      return playerWithoutSecret;
    });

    // Create the response object
    const gameData = {
      _id: game._id,
      saltKey: game.saltKey,
      createdByLobby: game.createdByLobby,
      creatorId: game.creatorId,
      players: filteredPlayers,
      teams: game.teams,
      totalPlayers: game.totalPlayers,
      teamTrees: game.teamTrees,
      serverIP: game.serverIP,
      secretKey: userPlayer?.secret || null, // Add secret only for the requesting user
    };

    return gameData;
  } catch (err) {
    LogModule.error({
      key1: "getCustomGame",
      key2: "failed",
      text1: "Failed to get custom game",
      text2: `Game ID: ${gameId}, User ID: ${userId}`,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
};

/* ----------------------------- CREATE LOBBY ----------------------------- */
const createLobby = async ({ userData, lobbyName }) => {
  const userId = userData?.userId;
  if (!userId || !lobbyName) {
    return { status: 400, message: "User ID and lobby name are required" };
  }

  try {
    LogModule.log({
      key1: "createLobby",
      key2: "start",
      text1: "Lobby creation started",
      text2: `User ID: ${userId}, Lobby Name: ${lobbyName}`,
    });

    await client.set(`lastActive:${userId}`, Date.now(), { EX: 1800 });

    // Check if user is already in an active game
    const activeGameCheck = await isUserInActiveGame(userId);
    if (activeGameCheck.inGame) {
      LogModule.log({
        key1: "createLobby",
        key2: "already_in_game",
        text1: "User already in active game",
        text2: `User ID: ${userId}, Game ID: ${activeGameCheck.gameId}`,
      });
      return {
        status: 400,
        message: "You are already in an active game",
        data: {
          gameId: activeGameCheck.gameId,
          lobbyId: activeGameCheck.lobbyId,
        },
      };
    }

    const existingLobbyId = await client.get(`${QUEUE_KEY}:${userId}`);
    if (existingLobbyId) {
      LogModule.log({
        key1: "createLobby",
        key2: "already_in_lobby",
        text1: "User already in another lobby",
        text2: `User ID: ${userId}, Existing Lobby: ${existingLobbyId}`,
      });
      return {
        status: 400,
        message: "You already have an active lobby",
      };
    }

    let lobbyId = generateLobbyId();
    // let tries = await featureFlag.getFeatureFlag(
    //   "lobby_tries",
    //   userData?.userId
    // );

    let tries = 0; // in future will have to fix this !

    while ((await client.exists(`lobby:${lobbyId}`)) && tries < 5) {
      lobbyId = generateLobbyId();
      tries++;
    }
    if (await client.exists(`lobby:${lobbyId}`)) {
      LogModule.error({
        key1: "createLobby",
        key2: "generation_failed",
        text1: "Lobby ID generation failed",
        text2: `User ID: ${userId}`,
      });
      return { status: 500, message: "Unable to create lobby now" };
    }

    const lobbyKey = `lobby:${lobbyId}`;
    const createdAt = new Date().toLocaleString();

    const lobbyData = {
      lobbyId,
      lobbyName,
      creatorId: userId,
      leaderId: userId,
      inGame: "false",
      createdAt,
      members: JSON.stringify([
        {
          userId,
          isLeader: true,
          joinedAt: new Date().toISOString(),
        },
      ]),
    };

    await client.hSet(lobbyKey, lobbyData);
    await client.expire(lobbyKey, LOBBY_TTL);
    await client.set(`${QUEUE_KEY}:${userId}`, lobbyId, { EX: LOBBY_TTL });

    LogModule.log({
      key1: "createLobby",
      key2: "success",
      text1: "Lobby created successfully",
      text2: `Lobby ID: ${lobbyId}, Creator: ${userId}`,
    });

    return {
      status: 200,
      data: {
        lobbyId,
        lobbyName,
        createdAt,
        isLeader: true,
        message: "Lobby created successfully. You are the leader.",
      },
    };
  } catch (err) {
    LogModule.error({
      key1: "createLobby",
      key2: "failed",
      text1: "Lobby creation failed",
      text2: `User ID: ${userId}`,
      error: err.message,
      stack: err.stack,
    });
    return { status: 500, message: "Internal server error" };
  }
};

/* ----------------------------- JOIN LOBBY ----------------------------- */
const joinLobby = async ({ userData, lobbyId }) => {
  const userId = userData?.userId;
  if (!userId || !lobbyId) {
    return { status: 400, message: "User ID and Lobby ID required" };
  }

  try {
    LogModule.log({
      key1: "joinLobby",
      key2: "start",
      text1: "Joining lobby started",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
    });

    await client.set(`lastActive:${userId}`, Date.now(), { EX: 1800 });

    // Check if user is already in an active game
    const activeGameCheck = await isUserInActiveGame(userId);
    if (activeGameCheck.inGame) {
      LogModule.log({
        key1: "joinLobby",
        key2: "already_in_game",
        text1: "User already in active game",
        text2: `User ID: ${userId}, Game ID: ${activeGameCheck.gameId}`,
      });
      return {
        status: 400,
        message: "You are already in an active game",
        data: {
          gameId: activeGameCheck.gameId,
          lobbyId: activeGameCheck.lobbyId,
        },
      };
    }

    const existingLobbyId = await client.get(`${QUEUE_KEY}:${userId}`);

    // another case to be able to re-join lobbby
    if (existingLobbyId && existingLobbyId !== lobbyId) {
      LogModule.log({
        key1: "joinLobby",
        key2: "already_in_other_lobby",
        text1: "User already in another lobby",
        text2: `User ID: ${userId}, Other Lobby: ${existingLobbyId}`,
      });
      return {
        status: 400,
        message: "You are already in another lobby",
      };
    }

    const lobbyKey = `lobby:${lobbyId}`;
    const lobbyExists = await client.exists(lobbyKey);
    if (!lobbyExists) {
      LogModule.error({
        key1: "joinLobby",
        key2: "not_found",
        text1: "Lobby not found",
        text2: `Lobby ID: ${lobbyId}`,
      });
      return { status: 404, message: "Lobby not found" };
    }

    const lobbyData = await client.hGetAll(lobbyKey);
    const members = JSON.parse(lobbyData.members || "[]");

    if (members.some((m) => m.userId === userId)) {
      LogModule.log({
        key1: "joinLobby",
        key2: "already_member",
        text1: "User already member of lobby",
        text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      });
      return { status: 400, message: "Already in this lobby" };
    }

    // Add the new member to the lobby (no limit check)
    members.push({
      userId,
      isLeader: false,
      joinedAt: new Date().toISOString(),
    });

    await client.hSet(lobbyKey, "members", JSON.stringify(members));
    await client.expire(lobbyKey, LOBBY_TTL);
    await client.set(`${QUEUE_KEY}:${userId}`, lobbyId, { EX: LOBBY_TTL });

    LogModule.log({
      key1: "joinLobby",
      key2: "success",
      text1: "User joined lobby successfully",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}, Members: ${members.length}`,
    });

    return {
      status: 200,
      data: {
        lobbyId,
        lobbyName: lobbyData.lobbyName,
        members,
        leaderId: lobbyData.leaderId,
      },
      message: "Joined lobby successfully",
    };
  } catch (err) {
    LogModule.error({
      key1: "joinLobby",
      key2: "failed",
      text1: "Joining lobby failed",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      error: err.message,
      stack: err.stack,
    });
    return { status: 500, message: "Internal server error" };
  }
};

// Get Character
const getCharacterAndName = async (userId) => {
  const result = await UserProfile.findAndSelect({ userId }, "characterId name");
  const profile = result?.[0];
  return { characterId: profile?.characterId || null, name: profile?.name || null };
};

/* ---------------------- MOVE LOBBY TO MONGO + CREATE GAME ---------------------- */
async function moveLobbyToMongoAndCreateGame(lobbyId, lobbyData) {
  try {
    LogModule.log({
      key1: "moveLobbyToMongo",
      key2: "start",
      text1: "Moving lobby to MongoDB",
      text2: `Lobby ID: ${lobbyId}`,
    });

    let members = JSON.parse(lobbyData.members || "[]");

    // Ensure creator is also added to players
    const creatorId = lobbyData.creatorId;
    if (!members.some((m) => m.userId === creatorId)) {
      members.unshift({
        userId: creatorId,
        isLeader: true,
        joinedAt: new Date().toISOString(),
      });
    }

    // Fix use bulk calls
    const players = await Promise.all(
      members.map(async (m, i) => {
        const { characterId, name } = await getCharacterAndName(m.userId);
        return {
          userId: m.userId,
          name,
          secret: generateSecret(16),
          characterId,
          clientId: i + 1,
          team: "A",
        };
      })
    );

    // Add filler bots if feature flag is enabled
    const shouldSpawnBots = await featureFlag.getFeatureFlag("spawn_filler_bots");
    if (shouldSpawnBots && players.length < 32) {
      const activeCharacters = await Character.find({ isActive: true });
      if (activeCharacters.length > 0) {
        const botsNeeded = 32 - players.length;
        for (let i = 0; i < botsNeeded; i++) {
          const randomChar = activeCharacters[Math.floor(Math.random() * activeCharacters.length)];
          players.push({
            userId: "user_id",
            name: `Bot_${i + 1}`,
            secret: "secret",
            characterId: randomChar._id.toString(),
            clientId: players.length + 1,
            team: "A",
            isBot: true,
          });
        }
      }
    }

    const newGame = await CustomGame.create({
      saltKey: generateSecret(32),
      createdByLobby: lobbyId,
      creatorId,
      players,
      totalPlayers: players.length,
    });

    // divide playerss
    const teamsData = dividePlayersIntoTeams(newGame.players);

    // Update game with team information and return updated document
    const updatedGame = await CustomGame.findByIdAndUpdate(newGame._id, {
      teams: {
        teamA: teamsData.teamA,
        teamB: teamsData.teamB,
      },
      players: teamsData.players, // Update players with team info
      teamTrees: teamsData.teamTrees,
    });

    await Lobby.create({
      lobbyId,
      lobbyName: lobbyData.lobbyName,
      creatorId,
      leaderId: lobbyData.leaderId,
      members,
      inGame: false,
      gameId: newGame._id,
    });

    LogModule.log({
      key1: "moveLobbyToMongo",
      key2: "success",
      text1: "Lobby moved to MongoDB successfully",
      text2: `Lobby ID: ${lobbyId}, Game ID: ${newGame._id}`,
    });

    return updatedGame;
  } catch (err) {
    LogModule.error({
      key1: "moveLobbyToMongo",
      key2: "failed",
      text1: "Moving lobby to MongoDB failed",
      text2: `Lobby ID: ${lobbyId}`,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

/* ----------------------------- START MATCH ----------------------------- */
const startMatch = async ({ userData, lobbyId }) => {
  const userId = userData?.userId;
  if (!userId || !lobbyId) {
    return { status: 400, message: "User ID and Lobby ID required" };
  }

  // Check if game start is allowed
    const allowGameStart = await featureFlag.getFeatureFlag("allow_prod_game_start");
    if (process.env.NODE_ENV === "production" && !allowGameStart) {
      LogModule.error({
        key1: "startMatch",
        key2: "game_start_disabled",
        text1: "Game start is disabled by feature flag",
        text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      });
      throw Error("Game start is currently disabled");
    }

  try {
    LogModule.log({
      key1: "startMatch",
      key2: "start",
      text1: "Starting match",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
    });

    const lobbyKey = `lobby:${lobbyId}`;
    const lobbyData = await client.hGetAll(lobbyKey);
    if (!lobbyData || !lobbyData.lobbyId) {
      // Check if game already started from mongo
      const existingLobby = await Lobby.findOne({ lobbyId, inGame: true });

      if (existingLobby) {
        LogModule.log({
          key1: "startMatch",
          key2: "already_started",
          text1: "Match already started",
          text2: `Lobby ID: ${lobbyId}`,
        });
        return {
          status: 400,
          message: "Match has already started for this lobby",
        };
      }

      LogModule.error({
        key1: "startMatch",
        key2: "lobby_not_found",
        text1: "Lobby not found",
        text2: `Lobby ID: ${lobbyId}`,
      });
      return { status: 404, message: "Lobby not found or already converted" };
    }

    const members = JSON.parse(lobbyData.members || "[]");
    const userMember = members.find((m) => m.userId === userId);
    if (!userMember) {
      LogModule.error({
        key1: "startMatch",
        key2: "not_member",
        text1: "User not member of lobby",
        text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      });
      return { status: 403, message: "You are not part of this lobby" };
    }

    if (!userMember.isLeader) {
      LogModule.error({
        key1: "startMatch",
        key2: "not_leader",
        text1: "User not lobby leader",
        text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      });
      return {
        status: 403,
        message: "Only the lobby leader can start the match",
      };
    }

    // Get Build
    const activeBuild = await Build.findOne({
      isDeleted: false,
      isActive: true,
    });

    if (activeBuild) {
      LogModule.log({
        key1: "startMatch",
        key2: "success",
        text1: "Build formed successfully !",
        text2: `activeBuild = ${activeBuild}`,
      });
    } else {
      LogModule.error({
        key1: "startMatch",
        key2: "error",
        text1: "Build coundt be formed no build found in DB",
        text2: "Make one build from dashbaord",
      });
    }

    const newGame = await moveLobbyToMongoAndCreateGame(
      lobbyId,
      lobbyData,
      userId
    );

    // call aws to create server
    const unityServerResponse = await createServer(
      newGame._id.toString(),
      activeBuild.version,
      lobbyId,
    );

    // Save EC2 instance IDs only in production
    if (process.env.NODE_ENV === "production" && unityServerResponse) {
      await CustomGame.findByIdAndUpdate(newGame._id, {
        ec2InstanceIds: unityServerResponse,
      });
    }

    LogModule.log({
      key1: "startMatch",
      key2: "success",
      text1: "Match started successfully",
      text2: `Lobby ID: ${lobbyId}, Game ID: ${newGame._id}`,
    });

    return {
      status: 200,
      data: {
        gameId: newGame._id.toString(),
        saltKey: newGame.saltKey,
        players: newGame.players,
        teams: newGame.teams,
        totalPlayers: newGame.totalPlayers,
        teamTree: newGame.teamTrees,
        serverIP: unityServerResponse.data?.currentGame?.serverIP,
        message: "Match started successfully, waiting for server to start...!",
        createdServerResponse: unityServerResponse,
      },
    };
  } catch (err) {
    LogModule.error({
      key1: "startMatch",
      key2: "failed",
      text1: "Starting match failed",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      error: err.message,
      stack: err.stack,
    });
    return { status: 500, message: "Internal server error" };
  }
};

/* ----------------------------- GET LOBBY STATUS ----------------------------- */
const getLobbyStatus = async ({ userData, lobbyId }) => {
  const userId = userData?.userId;
  if (!userId || !lobbyId)
    return { status: 400, message: "User ID and Lobby ID required" };

  if (lobbyId.length !== 5) {
    return { status: 400, message: "Invalid Lobby ID format" };
  }
  try {
    LogModule.log({
      key1: "getLobbyStatus",
      key2: "start",
      text1: "Getting lobby status",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
    });

    // update last active timestamp
    await client.set(`lastActive:${userId}`, Date.now(), { EX: 1800 });

    // FIRST: Check MongoDB if game already started (more reliable)
    const mongoLobby = await Lobby.findOne({ lobbyId, inGame: true });
    if (mongoLobby) {
      // Game started - find the game data using helper function
      const currentGame = await getCustomGame(mongoLobby.gameId, userId);
      if (currentGame) {
        const isPlayer = currentGame.players.some(
          (p) => String(p.userId) === String(userId)
        );

        if (!isPlayer) {
          LogModule.error({
            key1: "getLobbyStatus",
            key2: "not_player",
            text1: "User not player in game",
            text2: `User ID: ${userId}, Game ID: ${currentGame._id}`,
          });
          return { status: 403, message: "You are not part of this game" };
        }

        LogModule.log({
          key1: "getLobbyStatus",
          key2: "game_started",
          text1: "Game already started",
          text2: `Game ID: ${currentGame._id}, Lobby ID: ${lobbyId}`,
        });

        return {
          status: 200,
          message: "Game already started",
          data: {
            gameId: currentGame._id.toString(),
            saltKey: currentGame.saltKey,
            serverIP: currentGame.serverIP,
            players: currentGame.players,
            secretKey: currentGame.secretKey,
            teams: currentGame.teams,
            totalPlayers: currentGame.totalPlayers,
            playerTeam: currentGame.players.find(
              (p) => String(p.userId) === String(userId)
            )?.team,
            inLobby: false,
            inGame: true,
            lobbyId: lobbyId,
          },
        };
      }
    }

    // SECOND: Check Redis for active games (fallback)
    const gameKeys = await client.keys("currentGame:*");
    for (const key of gameKeys) {
      const gameRaw = await client.get(key);
      if (!gameRaw) continue;

      const gameData = JSON.parse(gameRaw);

      // Check both lobbyId field and createdByLobby from MongoDB
      const gameLobbyId = gameData.lobbyId;
      if (gameLobbyId === lobbyId) {
        const isPlayer = gameData.players.some(
          (p) => String(p.userId) === String(userId)
        );

        if (!isPlayer) {
          LogModule.error({
            key1: "getLobbyStatus",
            key2: "not_player_redis",
            text1: "User not player in Redis game",
            text2: `User ID: ${userId}, Game ID: ${gameData.gameId}`,
          });
          return { status: 403, message: "You are not part of this game" };
        }

        LogModule.log({
          key1: "getLobbyStatus",
          key2: "game_started_redis",
          text1: "Game already started (Redis)",
          text2: `Game ID: ${gameData.gameId}, Lobby ID: ${lobbyId}`,
        });

        return {
          status: 200,
          message: "Game already started",
          data: {
            ...gameData,
            inLobby: false,
            inGame: true,
          },
        };
      }
    }

    // THIRD: Check if lobby still exists in Redis
    const lobbyKey = `lobby:${lobbyId}`;
    const lobbyData = await client.hGetAll(lobbyKey);

    // CASE: LOBBY EXISTS IN REDIS (game not started yet)
    if (lobbyData && lobbyData.lobbyId) {
      const members = JSON.parse(lobbyData.members || "[]");
      const isMember = members.some((m) => String(m.userId) === String(userId));
      const isLeader = String(userId) === String(lobbyData.leaderId);

      if (!isMember && !isLeader) {
        LogModule.error({
          key1: "getLobbyStatus",
          key2: "not_member_lobby",
          text1: "User not member of lobby",
          text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
        });
        return { status: 403, message: "You are not part of this lobby" };
      }

      // Refresh TTLs on activity
      await client.expire(lobbyKey, LOBBY_TTL);
      await client.expire(`${QUEUE_KEY}:${userId}`, LOBBY_TTL);

      LogModule.log({
        key1: "getLobbyStatus",
        key2: "lobby_found",
        text1: "Lobby found in Redis",
        text2: `Lobby ID: ${lobbyId}, Members: ${members.length}`,
      });

      const enrichedMembers = await Promise.all(
        members.map(async (m) => {
          const { characterId, name } = await getCharacterAndName(m.userId);
          return { ...m, characterId, name };
        })
      );

      return {
        status: 200,
        message: "Lobby found",
        data: {
          lobbyId,
          lobbyName: lobbyData.lobbyName,
          members: enrichedMembers,
          leaderId: lobbyData.leaderId,
          isLeader,
          inLobby: true,
          inGame: false,
        },
      };
    }

    // NO LOBBY OR GAME FOUND
    LogModule.error({
      key1: "getLobbyStatus",
      key2: "not_found",
      text1: "Lobby or game not found",
      text2: `Lobby ID: ${lobbyId}`,
    });

    return { status: 404, message: "Lobby or game not found" };
  } catch (err) {
    LogModule.error({
      key1: "getLobbyStatus",
      key2: "failed",
      text1: "Getting lobby status failed",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      error: err.message,
      stack: err.stack,
    });
    return { status: 500, message: "Internal server error" };
  }
};

/* ----------------------------- LEAVE LOBBY ----------------------------- */
const leaveLobby = async ({ userData, lobbyId }) => {
  const userId = userData?.userId;

  // Validate input parameters
  if (!userId || !lobbyId) {
    return { status: 400, message: "User ID and Lobby ID are required" };
  }

  try {
    LogModule.log({
      key1: "leaveLobby",
      key2: "start",
      text1: "Leaving lobby",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
    });

    // Check if user is in an active game - cannot leave if in game
    const activeGameCheck = await isUserInActiveGame(userId);
    if (activeGameCheck.inGame) {
      LogModule.log({
        key1: "leaveLobby",
        key2: "in_active_game",
        text1: "Cannot leave lobby while in active game",
        text2: `User ID: ${userId}, Game ID: ${activeGameCheck.gameId}`,
      });
      return {
        status: 400,
        message: "Cannot leave lobby while in an active game",
        data: {
          gameId: activeGameCheck.gameId,
          lobbyId: activeGameCheck.lobbyId,
        },
      };
    }

    const lobbyKey = `lobby:${lobbyId}`;
    const lobbyExists = await client.exists(lobbyKey);

    // If lobby doesn't exist, user might have already left or lobby was deleted
    if (!lobbyExists) {
      // Clean up user-lobby mapping anyway
      await client.del(`${QUEUE_KEY}:${userId}`);
      LogModule.log({
        key1: "leaveLobby",
        key2: "already_left",
        text1: "Lobby not found or already left",
        text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      });
      return {
        status: 200,
        message: "Lobby not found or already left",
      };
    }

    // Get current lobby data
    const lobbyData = await client.hGetAll(lobbyKey);
    const members = JSON.parse(lobbyData.members || "[]");

    // Check if user is actually in this lobby
    const userMember = members.find((member) => member.userId === userId);
    if (!userMember) {
      LogModule.error({
        key1: "leaveLobby",
        key2: "not_member",
        text1: "User not member of lobby",
        text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      });
      return {
        status: 400,
        message: "User is not a member of this lobby",
      };
    }

    const isUserLeader = userId === lobbyData.leaderId;

    // CASE 1: User is the leader - destroy entire lobby
    if (isUserLeader) {
      // Remove the entire lobby from Redis
      await client.del(lobbyKey);

      // Remove user-lobby mappings for ALL members
      const deletePromises = members.map((member) =>
        client.del(`${QUEUE_KEY}:${member.userId}`)
      );
      await Promise.all(deletePromises);

      LogModule.log({
        key1: "leaveLobby",
        key2: "leader_destroyed",
        text1: "Lobby destroyed by leader",
        text2: `User ID: ${userId}, Lobby ID: ${lobbyId}, Members affected: ${members.length}`,
      });

      return {
        status: 200,
        message: "Lobby destroyed successfully as you were the leader",
        data: {
          lobbyDestroyed: true,
          membersAffected: members.length,
        },
      };
    }

    // CASE 2: User is a regular member - remove only this user
    const updatedMembers = members.filter((member) => member.userId !== userId);

    // Update lobby with remaining members
    await client.hSet(lobbyKey, "members", JSON.stringify(updatedMembers));

    // Remove user-lobby mapping for this user only
    await client.del(`${QUEUE_KEY}:${userId}`);

    LogModule.log({
      key1: "leaveLobby",
      key2: "member_left",
      text1: "Member left lobby",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}, Remaining members: ${updatedMembers.length}`,
    });

    return {
      status: 200,
      message: "Successfully left the lobby",
      data: {
        lobbyDestroyed: false,
        remainingMembers: updatedMembers.length,
      },
    };
  } catch (err) {
    LogModule.error({
      key1: "leaveLobby",
      key2: "failed",
      text1: "Leaving lobby failed",
      text2: `User ID: ${userId}, Lobby ID: ${lobbyId}`,
      error: err.message,
      stack: err.stack,
    });
    return {
      status: 500,
      message: "Internal server error while leaving lobby",
    };
  }
};

// Mock aws function create server
async function createServer(gameId, activeBuild, lobbyId) {
  try {
    LogModule.log({
      key1: "createServer",
      key2: "start",
      text1: "Creating EC2 server",
      text2: `Game ID: ${gameId}, Build: ${activeBuild}`,
    });

    // if dev env
    if (process.env.NODE_ENV !== "production") {
      // const serverStartedResponse = await serverStarted({
      //   ipAddress: "127.0.0.1",
      //   gameId: gameId,
      // });
      // LogModule.log({
      //   key1: "createServer",
      //   key2: "dev_mock",
      //   text1: "Using dev mock server",
      //   text2: `Game ID: ${gameId}`,
      // });
      // return serverStartedResponse;
      return {
        ipAddress: "127.0.0.1",
        gameId: gameId,
      };
    }

    const userData = `#!/bin/bash
IP=$(curl -s ifconfig.me)
sudo apt update
sudo apt install -y unzip
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

mkdir -p /home/ubuntu/game-server
chown ubuntu:ubuntu /home/ubuntu/game-server

sudo -u ubuntu bash -c 'cd /home/ubuntu/game-server && aws s3 sync s3://project-v-unity-builds/${activeBuild} . && chmod +x ./server.x86_64'

sudo -u ubuntu bash -c "cd /home/ubuntu/game-server && nohup ./server.x86_64 --serverIP=$IP --lobbyId=${lobbyId} --gameId=${gameId} > game_server.log 2>&1 &"
`;
    const parsedUserData = Buffer.from(userData).toString("base64");

    const command = new RunInstancesCommand({
      ImageId: "ami-02b8269d5e85954ef",
      InstanceType: "c6a.xlarge",
      KeyName: "project-v-keys",
      IamInstanceProfile: {
        Arn: "arn:aws:iam::245794247290:instance-profile/ec2-admin-access",
      },
      UserData: parsedUserData,
      BlockDeviceMappings: [
        {
          DeviceName: "/dev/sda1",
          Ebs: {
            Encrypted: false,
            DeleteOnTermination: true,
            Iops: 3000,
            SnapshotId: "snap-02aec5d73c95cb35b",
            VolumeSize: 8,
            VolumeType: "gp3",
            Throughput: 125,
          },
        },
      ],
      NetworkInterfaces: [
        {
          SubnetId: "subnet-03ba828a287b84ca8",
          AssociatePublicIpAddress: true,
          DeviceIndex: 0,
          Groups: ["sg-07819d8d77bc1f98f"],
        },
      ],
      // CreditSpecification: {
      //   CpuCredits: "standard",
      // },
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            {
              Key: "Name",
              Value: "unity-game-server",
            },
          ],
        },
      ],
      MetadataOptions: {
        HttpEndpoint: "enabled",
        HttpPutResponseHopLimit: 2,
        HttpTokens: "required",
      },
      PrivateDnsNameOptions: {
        HostnameType: "ip-name",
        EnableResourceNameDnsARecord: false,
        EnableResourceNameDnsAAAARecord: false,
      },
      MinCount: 1,
      MaxCount: 1,
    });
    const response = await ec2Client.send(command);
    const launchedInstances = response.Instances.map((instance) => {
      return instance.InstanceId;
    });

    LogModule.log({
      key1: "createServer",
      key2: "success",
      text1: userData,
      text2: `Game ID: ${gameId}, Instance IDs: ${launchedInstances.join(
        ", "
      )}`,
    });

    return launchedInstances;
  } catch (err) {
    LogModule.error({
      key1: "createServer",
      key2: "failed",
      text1: "EC2 server creation failed",
      text2: `Game ID: ${gameId}`,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

// inside lobby.js (exported functions)
const serverStarted = async (data) => {
  const { ipAddress, gameId } = data;

  try {
    LogModule.log({
      key1: "serverStarted",
      key2: "start",
      text1: "Server started callback",
      text2: `Game ID: ${gameId}, IP: ${ipAddress}`,
    });

    if (!ipAddress || !gameId) {
      ({
        key1: "serverStarted",
        key2: "validation_failed",
        text1: "Server started validation failed",
        text2: "Missing IP or Game ID",
      });
      return { status: 400, message: "ipAddress or gameId not received" };
    }

    // Find game by id and update
    const currentGame = await CustomGame.findByIdAndUpdate(gameId, {
      serverIP: ipAddress,
    });

    if (!currentGame) {
      LogModule.error({
        key1: "serverStarted",
        key2: "game_not_found",
        text1: "Game not found for server start",
        text2: `Game ID: ${gameId}`,
      });
      return { status: 404, message: "Game not found" };
    }

    // Store game in Redis
    await client.set(
      `currentGame:${currentGame._id.toString()}`,
      JSON.stringify({
        gameId: currentGame._id.toString(),
        inGame: true,
        saltKey: currentGame.saltKey,
        players: currentGame.players,
        teams: currentGame.teams,
        teamTrees: currentGame.teamTrees,
        totalPlayers: currentGame.totalPlayers,
        lobbyId: currentGame.createdByLobby,
        serverIP: ipAddress,
      })
    );

    const activeGameStr = await client.get(
      `currentGame:${currentGame._id.toString()}`
    );
    const activeGame = JSON.parse(activeGameStr);

    const lobbyIdToDelete = currentGame.createdByLobby;

    const deletedLobby = await client.del(`lobby:${lobbyIdToDelete}`);

    // Delete all player queue entries related to this above lobby
    await Promise.all(
      activeGame.players.map((player) =>
        client.del(`${QUEUE_KEY}:${player.userId}`)
      )
    );

    // Update lobby in database
    const updatedLobby = await Lobby.findOneAndUpdate(
      { gameId: currentGame._id },
      { inGame: true }
    );

    LogModule.log({
      key1: "serverStarted",
      key2: "success",
      text1: "Server started successfully",
      text2: `Game ID: ${gameId}, IP: ${ipAddress}, Lobby ID: ${lobbyIdToDelete}`,
    });

    return {
      status: 200,
      message: "Server started successfully",
      data: {
        message:
          "Game successfully started, updated lobby and game collections too.",
        currentGame: currentGame,
        lobby: updatedLobby,
      },
    };
  } catch (err) {
    LogModule.error({
      key1: "serverStarted",
      key2: "failed",
      text1: "Server started callback failed",
      text2: `Game ID: ${gameId}`,
      error: err.message,
      stack: err.stack,
    });
    return { status: 500, message: "Internal server error" };
  }
};

export const mockLobbyData = async (data) => {
  const { serverIP, clientIndex } = data;

  try {
    LogModule.log({
      key1: "mockLobbyData",
      key2: "start",
      text1: "Creating mock lobby data",
      text2: `Server IP: ${serverIP}, Client Index: ${clientIndex}`,
    });

    if (!serverIP || !clientIndex) {
      LogModule.error({
        key1: "mockLobbyData",
        key2: "validation_failed",
        text1: "Mock lobby validation failed",
        text2: "Missing serverIP or clientIndex",
      });
      return {
        status: 400,
        message: "serverIP and clientIndex are required",
      };
    }

    const globalKey = "currentLoadTestGame"; // shared mock game key

    const char = await Character.findOne();
    const fixedChar = char._id.toString();

    // Check if a mock game already exists
    let existing = await client.get(globalKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      const alreadyExists = parsed.players.some(
        (p) => p.clientId === Number(clientIndex)
      );

      if (!alreadyExists) {
        const newPlayer = {
          userId: crypto.randomBytes(12).toString("hex"),
          secret: generateSecret(16),
          characterId: fixedChar,
          clientId: Number(clientIndex),
        };
        parsed.players.push(newPlayer);
        await client.set(globalKey, JSON.stringify(parsed));
        LogModule.log({
          key1: "mockLobbyData",
          key2: "player_added",
          text1: "Player added to existing mock game",
          text2: `Client Index: ${clientIndex}`,
        });
      } else {
        LogModule.log({
          key1: "mockLobbyData",
          key2: "player_exists",
          text1: "Player already in mock game",
          text2: `Client Index: ${clientIndex}`,
        });
      }

      return {
        status: 200,
        message: "Existing mock game returned",
        data: JSON.parse(await client.get(globalKey)),
      };
    }

    // If not exists → create new game
    const fakePlayers = [
      {
        userId: crypto.randomBytes(12).toString("hex"),
        secret: generateSecret(16),
        characterId: fixedChar,
        clientId: Number(clientIndex),
      },
    ];

    const gameData = {
      gameId: crypto.randomBytes(12).toString("hex"),
      inGame: true,
      saltKey: generateSecret(16),
      players: fakePlayers,
      lobbyId: generateLobbyId(),
      serverIP,
    };

    await client.set(globalKey, JSON.stringify(gameData));

    LogModule.log({
      key1: "mockLobbyData",
      key2: "game_created",
      text1: "New mock game created",
      text2: `Game ID: ${gameData.gameId}, Client Index: ${clientIndex}`,
    });

    return {
      status: 200,
      message: "Mock game created successfully",
      data: gameData,
    };
  } catch (err) {
    LogModule.error({
      key1: "mockLobbyData",
      key2: "failed",
      text1: "Mock lobby data creation failed",
      text2: `Client Index: ${clientIndex}`,
      error: err.message,
      stack: err.stack,
    });
    return { status: 500, message: "Internal server error" };
  }
};

// Fisher - Yates Shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dividePlayersIntoTeams(players) {
  // Separate real players and bots, shuffle each group independently
  const realPlayers = players.filter((p) => !p.isBot);
  const botPlayers = players.filter((p) => p.isBot);
  shuffle(realPlayers);
  shuffle(botPlayers);

  const teamA = [];
  const teamB = [];

  // Distribute real players equally first (alternating A/B)
  const assignToTeam = (player) => {
    const teamPlayer = {
      userId: player.userId,
      clientId: player.clientId,
      characterId: player.characterId,
    };
    if (teamA.length <= teamB.length) {
      teamA.push(teamPlayer);
      player.team = "A";
    } else {
      teamB.push(teamPlayer);
      player.team = "B";
    }
  };

  realPlayers.forEach(assignToTeam);
  // Then distribute bots equally
  botPlayers.forEach(assignToTeam);

  const shuffledPlayers = [...realPlayers, ...botPlayers];

  const teamATree = buildTeamTree(teamA);
  const teamBTree = buildTeamTree(teamB);

  return {
    teamA,
    teamB,
    players: shuffledPlayers,
    teamTrees: {
      A: teamATree,
      B: teamBTree,
    },
  };
}

/* ----------------------- GET SERVER LOBBY STATUS (No User) ----------------------- */
const getServerLobbyStatus = async ({ lobbyId }) => {
  if (!lobbyId) return { status: 400, message: "Lobby ID required" };

  if (lobbyId.length !== 5)
    return { status: 400, message: "Invalid Lobby ID format" };

  try {
    LogModule.log({
      key1: "getServerLobbyStatus",
      key2: "start",
      text1: "Unity server requesting lobby status",
      text2: `Lobby ID: ${lobbyId}`,
    });

    /* -------------------------------------------------------------------------- */
    /*                  1. CHECK REDIS ACTIVE GAMES (GAME READY)                 */
    /* -------------------------------------------------------------------------- */
    const gameKeys = await client.keys("currentGame:*");
    for (const key of gameKeys) {
      const raw = await client.get(key);
      if (!raw) continue;

      const gameData = JSON.parse(raw);
      const redisLobbyId = gameData.lobbyId || gameData.createdByLobby;

      if (redisLobbyId === lobbyId) {
        LogModule.log({
          key1: "getServerLobbyStatus",
          key2: "redis_game_ready",
          text1: "Game READY in Redis",
          text2: `GameID: ${gameData.gameId}, LobbyID: ${lobbyId}`,
        });

        return {
          status: 200,
          message: "Game ready",
          data: {
            inLobby: false,
            inGame: true,
            lobbyId,
            gameId: gameData.gameId,
            saltKey: gameData.saltKey,
            serverIP: gameData.serverIP,
            players: gameData.players,
            teams: gameData.teams,
            totalPlayers: gameData.totalPlayers,
          },
        };
      }
    }

    /* -------------------------------------------------------------------------- */
    /*             2. CHECK MONGODB (GAME CREATED BUT NOT READY)                 */
    /* -------------------------------------------------------------------------- */
    const mongoLobby = await Lobby.findOne({ lobbyId });
    if (mongoLobby && mongoLobby.gameId) {
      const currentGame = await CustomGame.findById(mongoLobby.gameId);

      if (currentGame) {
        LogModule.log({
          key1: "getServerLobbyStatus",
          key2: "mongo_game_created",
          text1: "Game created in MongoDB (waiting for server)",
          text2: `GameID: ${currentGame._id}, LobbyID: ${lobbyId}`,
        });

        return {
          status: 200,
          message: "Game created - waiting for server to start",
          data: {
            inLobby: false,
            inGame: true, // Game exists but server not ready
            lobbyId,
            gameId: currentGame._id.toString(),
            saltKey: currentGame.saltKey,
            serverIP: null, // No IP yet - server needs to call serverStarted
            players: currentGame.players,
            teams: currentGame.teams,
            totalPlayers: currentGame.totalPlayers,
          },
        };
      }
    }

    /* -------------------------------------------------------------------------- */
    /*                       3. CHECK REDIS LOBBY (NO GAME YET)                  */
    /* -------------------------------------------------------------------------- */
    const lobbyKey = `lobby:${lobbyId}`;
    const lobbyData = await client.hGetAll(lobbyKey);

    if (lobbyData && lobbyData.lobbyId) {
      const members = JSON.parse(lobbyData.members || "[]");

      LogModule.log({
        key1: "getServerLobbyStatus",
        key2: "redis_lobby_found",
        text1: "Lobby found in Redis",
        text2: `Members: ${members.length}`,
      });

      return {
        status: 200,
        message: "Lobby found",
        data: {
          inLobby: true,
          inGame: false,
          lobbyId,
          lobbyName: lobbyData.lobbyName,
          members,
          leaderId: lobbyData.leaderId,
        },
      };
    }

    /* -------------------------------------------------------------------------- */
    /*                            4. NOTHING FOUND                               */
    /* -------------------------------------------------------------------------- */
    LogModule.error({
      key1: "getServerLobbyStatus",
      key2: "not_found",
      text1: "Lobby or game not found",
      text2: `LobbyID: ${lobbyId}`,
    });

    return { status: 404, message: "Lobby or game not found" };
  } catch (err) {
    LogModule.error({
      key1: "getServerLobbyStatus",
      key2: "error",
      text1: "System error",
      text2: `LobbyID: ${lobbyId}`,
      error: err.message,
      stack: err.stack,
    });

    return { status: 500, message: "Internal server error" };
  }
};

/* ----------------------------- GET ACTIVE GAME ----------------------------- */
const getActiveGame = async ({ userData }) => {
  const userId = userData?.userId;
  if (!userId) {
    return { status: 400, message: "User ID required" };
  }

  try {
    // 1. Check if user is in an active game (Redis currentGame:*)
    const activeGameCheck = await isUserInActiveGame(userId);
    if (activeGameCheck.inGame) {
      const gameRaw = await client.get(`currentGame:${activeGameCheck.gameId}`);
      const gameData = gameRaw ? JSON.parse(gameRaw) : null;
      const player = gameData?.players?.find((p) => String(p.userId) === String(userId));

      return {
        status: 200,
        data: {
          state: "in_game",
          gameId: activeGameCheck.gameId,
          lobbyId: activeGameCheck.lobbyId,
          serverIP: gameData?.serverIP || null,
          clientId: player?.clientId ?? null,
          saltKey: gameData?.saltKey || null,
          secretKey: player?.secret || null,
        },
      };
    }

    // 2. Check if user is in a lobby
    const lobbyId = await client.get(`${QUEUE_KEY}:${userId}`);
    if (lobbyId) {
      const lobbyKey = `lobby:${lobbyId}`;
      const lobbyData = await client.hGetAll(lobbyKey);

      if (lobbyData && lobbyData.lobbyId) {
        // Check MongoDB in case match started but serverStarted hasn't fired yet
        const mongoLobby = await Lobby.findOne({ lobbyId, inGame: true });
        if (mongoLobby) {
          const game = await CustomGame.findById(mongoLobby.gameId);
          const player = game?.players?.find((p) => String(p.userId) === String(userId));
          return {
            status: 200,
            data: {
              state: "in_game",
              gameId: mongoLobby.gameId.toString(),
              lobbyId,
              serverIP: game?.serverIP || null,
              clientId: player?.clientId ?? null,
              saltKey: game?.saltKey || null,
              secretKey: player?.secret || null,
            },
          };
        }

        return {
          status: 200,
          data: {
            state: "in_lobby",
            lobbyId,
            lobbyName: lobbyData.lobbyName,
            leaderId: lobbyData.leaderId,
          },
        };
      } else {
        // Stale userLobby key - lobby hash is gone, clean up
        await client.del(`${QUEUE_KEY}:${userId}`);
      }
    }

    // 3. Neither in game nor in lobby
    return {
      status: 200,
      data: {
        state: "idle",
      },
    };
  } catch (err) {
    LogModule.error({
      key1: "getActiveGame",
      key2: "failed",
      text1: "Getting active game state failed",
      text2: `User ID: ${userId}`,
      error: err.message,
      stack: err.stack,
    });
    return { status: 500, message: "Internal server error" };
  }
};

export default {
  createLobby,
  joinLobby,
  getLobbyStatus,
  startMatch,
  leaveLobby,
  serverStarted,
  mockLobbyData,
  getServerLobbyStatus,
  getActiveGame,
};
