import redis from "../../db/redis.js";
import Lobby from "../../model/Lobby.js";
import CustomGame from "../../model/CustomGame.js";
import LogModule from "../log/index.js";

const redisClient = redis.client;

/**
 * Get all active lobbies from Redis + all active/completed games from Redis + MongoDB
 */
const getGameSessions = async () => {
  try {
    // Fetch from Redis and MongoDB in parallel
    // modelWrapper returns plain arrays — no .sort()/.limit()/.lean() chaining
    const [redisLobbies, redisGames, mongoLobbies, mongoGames] =
      await Promise.all([
        getRedisLobbies(),
        getRedisActiveGames(),
        Lobby.find({}),
        CustomGame.findAndSelect(
          {},
          "-saltKey -teamTrees -ec2InstanceIds"
        ),
      ]);

    // Sort by newest first and limit in JS
    mongoLobbies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    mongoGames.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentLobbies = mongoLobbies.slice(0, 50);
    const recentGames = mongoGames.slice(0, 50);

    // Build active lobbies list (from Redis — these are waiting lobbies)
    const activeLobbies = redisLobbies.map((lobby) => ({
      lobbyId: lobby.lobbyId,
      lobbyName: lobby.lobbyName || "Unnamed Lobby",
      creatorId: lobby.creatorId,
      leaderId: lobby.leaderId,
      memberCount: lobby.members?.length || 0,
      members: lobby.members || [],
      createdAt: lobby.createdAt,
      status: "waiting",
    }));

    // Build active games list (from Redis — these are running games)
    const activeGames = redisGames.map((game) => {
      const realPlayers = game.players
        ? game.players.filter((p) => !p.isBot)
        : [];
      const botCount = game.players
        ? game.players.filter((p) => p.isBot).length
        : 0;
      return {
        gameId: game.gameId,
        lobbyId: game.lobbyId,
        serverIP: game.serverIP || null,
        totalPlayers: game.totalPlayers || 0,
        realPlayerCount: realPlayers.length,
        botCount,
        teamA: game.teams?.teamA?.length || 0,
        teamB: game.teams?.teamB?.length || 0,
        status: "running",
      };
    });

    // Build completed games list (from MongoDB)
    const completedGames = recentGames
      .filter((g) => g.completed)
      .slice(0, 20)
      .map((game) => {
        const realPlayers = game.players
          ? game.players.filter((p) => !p.isBot)
          : [];
        const botCount = game.players
          ? game.players.filter((p) => p.isBot).length
          : 0;
        return {
          gameId: game._id.toString(),
          lobbyId: game.createdByLobby,
          creatorId: game.creatorId,
          totalPlayers: game.totalPlayers || 0,
          realPlayerCount: realPlayers.length,
          botCount,
          teamA: game.teams?.teamA?.length || 0,
          teamB: game.teams?.teamB?.length || 0,
          serverIP: game.serverIP || null,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
          status: "completed",
        };
      });

    // Build in-progress lobbies (from MongoDB — lobbies with inGame: true but game not completed)
    const inGameLobbies = recentLobbies
      .filter((l) => l.inGame && !l.gameCompleted)
      .map((lobby) => ({
        lobbyId: lobby.lobbyId,
        lobbyName: lobby.lobbyName || "Unnamed Lobby",
        creatorId: lobby.creatorId,
        memberCount: lobby.members?.length || 0,
        gameId: lobby.gameId?.toString() || null,
        createdAt: lobby.createdAt,
        status: "in_game",
      }));

    // Summary counts
    const summary = {
      activeLobbies: activeLobbies.length,
      runningGames: activeGames.length,
      completedGames: completedGames.length,
      inGameLobbies: inGameLobbies.length,
      totalActivePlayers: activeGames.reduce(
        (sum, g) => sum + g.realPlayerCount,
        0
      ),
      totalWaitingPlayers: activeLobbies.reduce(
        (sum, l) => sum + l.memberCount,
        0
      ),
    };

    return {
      success: true,
      message: "Game sessions retrieved successfully",
      data: {
        summary,
        activeLobbies,
        activeGames,
        completedGames,
        inGameLobbies,
      },
    };
  } catch (error) {
    LogModule.error({
      key1: "getGameSessions",
      key2: "error",
      text1: "Failed to get game sessions",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: "Failed to fetch game sessions",
    };
  }
};

/**
 * Fetch all active lobbies from Redis
 */
async function getRedisLobbies() {
  try {
    const keys = await redisClient.keys("lobby:*");
    if (!keys || keys.length === 0) return [];

    const lobbies = [];
    for (const key of keys) {
      const data = await redisClient.hGetAll(key);
      if (data && Object.keys(data).length > 0) {
        let members = [];
        try {
          members = data.members ? JSON.parse(data.members) : [];
        } catch {
          members = [];
        }
        lobbies.push({
          lobbyId: data.lobbyId || key.replace("lobby:", ""),
          lobbyName: data.lobbyName,
          creatorId: data.creatorId,
          leaderId: data.leaderId,
          inGame: data.inGame === "true",
          createdAt: data.createdAt,
          members,
        });
      }
    }
    return lobbies;
  } catch (error) {
    LogModule.error({
      key1: "getRedisLobbies",
      key2: "error",
      text1: "Failed to fetch Redis lobbies",
      text2: error.message,
    });
    return [];
  }
}

/**
 * Fetch all active games from Redis
 */
async function getRedisActiveGames() {
  try {
    const keys = await redisClient.keys("currentGame:*");
    if (!keys || keys.length === 0) return [];

    const games = [];
    for (const key of keys) {
      const raw = await redisClient.get(key);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          games.push({
            gameId: data.gameId || key.replace("currentGame:", ""),
            lobbyId: data.lobbyId,
            serverIP: data.serverIP,
            totalPlayers: data.totalPlayers,
            players: data.players || [],
            teams: data.teams || {},
            inGame: data.inGame,
          });
        } catch {
          // skip malformed entries
        }
      }
    }
    return games;
  } catch (error) {
    LogModule.error({
      key1: "getRedisActiveGames",
      key2: "error",
      text1: "Failed to fetch Redis active games",
      text2: error.message,
    });
    return [];
  }
}

export default {
  getGameSessions,
};
