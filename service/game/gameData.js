import Game from "../../model/Game.js";
import LogModule from "../../service/log/index.js";

async function gameData({ gameId, userData } = {}) {
  try {
    if (!gameId) {
      LogModule.error({
        key1: "gameData",
        key2: "game_data_failed",
        text1: "Game id is not provided",
        text2: `gameId: ${gameId || ""}`,
      });

      return { status: 400, message: "Game ID is required" };
    }

    const game = await Game.findById(gameId);
    if (!game) {
      LogModule.error({
        key1: "gameData",
        key2: "game_find_failed",
        text1: "Game not present in games collection",
        text2: `game: ${""}`,
      });
      return { status: 404, message: "Game not found" };
    }

    LogModule.log({
      key1: "gameData",
      key2: "game_found",
      text1: "Game fetched successfully!",
      text2: `Game: ${game}`,
    });

    return {
      status: 200,
      message: "Game data fetched successfully",
      data: game,
    };
  } catch (err) {
    return {
      status: 500,
      message: "Error fetching game data",
      error: err.message,
    };
  }
}

export default { gameData };
