import Character from "../../model/Character.js";
import Building from "../../model/Building.js";
import Inventory from "../../model/Inventory.js";
import GlobalConfig from "../../model/GlobalConfig.js";
import mongoose from "mongoose";
import Game from "../../model/Game.js";
import LogModule from "../../service/log/index.js";
import CustomGame from "../../model/CustomGame.js";

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

// return all active buildings
const getActiveBuildings = async () => {
  try {
    LogModule.log({
      key1: "getActiveBuildings",
      key2: "start",
      text1: "Fetching all active buildings",
    });

    const buildings = await Building.find({ isActive: true });

    LogModule.log({
      key1: "getActiveBuildings",
      key2: "success",
      text1: "Buildings fetched successfully",
      text2: `Count: ${buildings.length}`,
    });

    return buildings;
  } catch (error) {
    LogModule.error({
      key1: "getActiveBuildings",
      key2: "failed",
      text1: "Failed to fetch buildings",
      text2: `Error: ${error.message}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// return all active inventory items
const getActiveInventory = async () => {
  try {
    LogModule.log({
      key1: "getActiveInventory",
      key2: "start",
      text1: "Fetching all active inventory items",
    });

    const items = await Inventory.find({ isActive: true });

    LogModule.log({
      key1: "getActiveInventory",
      key2: "success",
      text1: "Inventory items fetched successfully",
      text2: `Count: ${items.length}`,
    });

    return items;
  } catch (error) {
    LogModule.error({
      key1: "getActiveInventory",
      key2: "failed",
      text1: "Failed to fetch inventory items",
      text2: `Error: ${error.message}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// return all global config entries
const getGlobalConfig = async () => {
  try {
    LogModule.log({
      key1: "getGlobalConfig",
      key2: "start",
      text1: "Fetching all global config entries",
    });

    const configs = await GlobalConfig.find();

    LogModule.log({
      key1: "getGlobalConfig",
      key2: "success",
      text1: "Global config entries fetched successfully",
      text2: `Count: ${configs.length}`,
    });

    return configs;
  } catch (error) {
    LogModule.error({
      key1: "getGlobalConfig",
      key2: "failed",
      text1: "Failed to fetch global config",
      text2: `Error: ${error.message}`,
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

    // TODO: handle for both, game and custom game
    const allGames = await CustomGame.findOne({ _id: id });
    if (!allGames) {
      throw new Error("Game not found");
    }

    const [characters, buildings, inventory, globalConfig] = await Promise.all([
      getActiveCharacters(),
      getActiveBuildings(),
      getActiveInventory(),
      getGlobalConfig(),
    ]);

    if (!characters || characters.length === 0) {
      throw new Error("No characters found");
    }

    LogModule.log({
      key1: "serverData",
      key2: "success",
      text1: "Server data fetched successfully",
      text2: `Game ID: ${id}, Characters: ${characters.length}, Buildings: ${buildings.length}, Inventory: ${inventory.length}, GlobalConfig: ${globalConfig.length}`,
    });

    return {
      game: allGames,
      characters,
      buildings,
      inventory,
      globalConfig,
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
  getActiveBuildings,
  getActiveInventory,
  getGlobalConfig,
};
