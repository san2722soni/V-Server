import Character from "../../model/Character.js";
import mongoose from "mongoose";
import Game from "../../model/Game.js";
import LogModule from "../../service/log/index.js";

// return all characters
const getActiveCharacters = async () => {
  try {
    LogModule.log({
      key1: "getActiveCharacters",
      key2: "start",
      text1: "Fetching all active characters",
      text2: "Process initiated",
    });

    const characters = await Character.find({ isActive: true });

    LogModule.log({
      key1: "getActiveCharacters",
      key2: "success",
      text1: "Characters fetched successfully",
      text2: `Count: ${characters.length}`,
    });

    if (!characters || characters.length === 0) {
      throw new Error("No characters found");
    }

    return characters;
  } catch (error) {
    LogModule.error({
      key1: "getActiveCharacters",
      key2: "failed",
      text1: "Failed to fetch characters",
      text2: `Error: ${error.message}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// returns active character by id
const getActiveCharacterById = async ({ id }) => {
  try {
    LogModule.log({
      key1: "getActiveCharacterById",
      key2: "start",
      text1: "Fetching character by ID",
      text2: `Character ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing character ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid character ID format");
    }

    const character = await Character.findOne({ _id: id, isActive: true });
    if (!character) {
      throw new Error("Character not found");
    }

    LogModule.log({
      key1: "getActiveCharacterById",
      key2: "success",
      text1: "Character found successfully",
      text2: `Character ID: ${id}`,
    });

    return character;
  } catch (error) {
    LogModule.error({
      key1: "getActiveCharacterById",
      key2: "failed",
      text1: "Failed to fetch character by ID",
      text2: `Character ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// return game object by id and all active characters
const serverData = async ({ id }) => {
  try {
    LogModule.log({
      key1: "serverData",
      key2: "start",
      text1: "Fetching server data",
      text2: `Game ID: ${id}`,
    });

    if (!id) {
      throw new Error("Game ID required!");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Game ID format");
    }

    const allGames = await Game.findOne({ _id: id });
    if (!allGames) {
      throw new Error("Game not found");
    }

    const characters = await getActiveCharacters();
    if (!characters || characters.length === 0) {
      throw new Error("No characters found");
    }

    LogModule.log({
      key1: "serverData",
      key2: "success",
      text1: "Server data fetched successfully",
      text2: `Game ID: ${id}, Characters count: ${characters.length}`,
    });

    return {
      game: allGames,
      characters: characters,
    };
  } catch (error) {
    LogModule.error({
      key1: "serverData",
      key2: "failed",
      text1: "Failed to fetch server data",
      text2: `Game ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default {
  serverData,
  getActiveCharacters,
  getActiveCharacterById,
};
