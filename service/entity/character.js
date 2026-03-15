import Character from "../../model/Character.js";
import mongoose from "mongoose";
import LogModule from "../log/index.js";

// return all characters
const getAllCharacters = async () => {
  try {
    LogModule.log({
      key1: "getAllCharacters",
      key2: "start",
      text1: "Fetching all characters",
      text2: "Process initiated",
    });

    const characters = await Character.find();

    if (!characters || characters.length === 0) {
      throw new Error("No characters found");
    }

    LogModule.log({
      key1: "getAllCharacters",
      key2: "success",
      text1: "All characters fetched successfully",
      text2: `Count: ${characters.length}`,
    });

    return characters;
  } catch (error) {
    LogModule.error({
      key1: "getAllCharacters",
      key2: "failed",
      text1: "Failed to fetch all characters",
      text2: "No characters found",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getById = async ({ id }) => {
  try {
    LogModule.log({
      key1: "getCharacterById",
      key2: "start",
      text1: "Fetching character by ID",
      text2: `Character ID: ${id || "not provided"}`,
    });

    const cleanId = String(id || "").trim();

    // ⭐ If Fastify request-id overrides client's ID → ignore it
    if (cleanId.startsWith("req-")) {
      return await getAllCharacters();
    }

    // ⭐ If ID missing → return all
    if (!cleanId) {
      return await getAllCharacters();
    }

    // ⭐ If ID invalid → return error
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return { success: false, message: "Invalid character ID" };
    }

    const character = await Character.findById(cleanId);

    if (!character) {
      return {
        success: false,
        message: "No character found with this ID",
      };
    }

    return {
      success: true,
      data: character,
      abilities: character.abilities.map((a) => ({
        description: a.description,
        v1: a.v1,
        v2: a.v2,
        v3: a.v3,
        v4: a.v4,
      })),
    };
  } catch (error) {
    LogModule.error({
      key1: "getCharacterById",
      key2: "failed",
      text1: error.message,
      text2: `Character ID: ${id}`,
      stack: error.stack,
    });

    return {
      success: false,
      message: error.message,
      error,
    };
  }
};

const create = async (data) => {
  try {
    LogModule.log({
      key1: "createCharacter",
      key2: "start",
      text1: "Creating new character",
      text2: "Process initiated",
    });

    const requiredFields = [
      "health",
      "maxHealth",
      "isActive",
      "isStun",
      "tribe",
      "availableRole",
      "moveSpeed",
      "attackType",
      "attackRange",
      "level",
      "shield",
      "isVisible",
      "activeShield",
      "vision",
      "target",
      "weight",
      "inventory",
      "buildingsCanBuild",
      "buildingsCanUse",
      "artifactsCanUse",
      "artifactsCanCraft",
      "resourcesCanCraft",
      "abilities",
      "name",
      "weapon",
    ];

    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    const {
      health,
      maxHealth,
      isActive,
      isStun,
      tribe,
      availableRole,
      moveSpeed,
      attackType,
      attackRange,
      level,
      shield,
      isVisible,
      activeShield,
      vision,
      target,
      weight,
      inventory,
      buildingsCanBuild,
      buildingsCanUse,
      artifactsCanUse,
      artifactsCanCraft,
      resourcesCanCraft,
      abilities,
      weapon,
      name,
    } = data;

    const newCharacter = await Character.create({
      health,
      maxHealth,
      isActive,
      isStun,
      tribe,
      availableRole,
      moveSpeed,
      attackType,
      attackRange,
      level,
      shield,
      isVisible,
      activeShield,
      vision,
      target,
      weight,
      inventory,
      buildingsCanBuild,
      buildingsCanUse,
      artifactsCanUse,
      artifactsCanCraft,
      resourcesCanCraft,
      abilities: abilities?.map((ab) => ({
        description: ab.description,
        v1: ab.v1 || { key: null, value: null },
        v2: ab.v2 || { key: null, value: null },
        v3: ab.v3 || { key: null, value: null },
        v4: ab.v4 || { key: null, value: null },
      })),
      name,
      weapon,
    });

    LogModule.log({
      key1: "createCharacter",
      key2: "success",
      text1: "Character created successfully",
      text2: `Character ID: ${newCharacter._id}`,
    });

    return newCharacter;
  } catch (error) {
    LogModule.error({
      key1: "createCharacter",
      key2: "failed",
      text1: "Failed to create character",
      text2: "Creation process failed",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// update character function
const update = async ({ id, updates }) => {
  // ask here for this method
  try {
    LogModule.log({
      key1: "updateCharacter",
      key2: "start",
      text1: "Updating character",
      text2: `Character ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing character ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid character ID format");
    }

    if (updates.abilities) {
      updates.abilities = updates.abilities.map((ab) => ({
        description: ab.description,
        v1: ab.v1 || { key: null, value: null },
        v2: ab.v2 || { key: null, value: null },
        v3: ab.v3 || { key: null, value: null },
        v4: ab.v4 || { key: null, value: null },
      }));
    }

    const updatedCharacter = await Character.findByIdAndUpdate(id, {
      $set: updates,
    });

    if (!updatedCharacter) {
      throw new Error("Character not found");
    }

    LogModule.log({
      key1: "updateCharacter",
      key2: "success",
      text1: "Character updated successfully",
      text2: `Character ID: ${id}`,
    });

    return updatedCharacter;
  } catch (error) {
    LogModule.error({
      key1: "updateCharacter",
      key2: "failed",
      text1: "Failed to update character",
      text2: `Character ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// delete character function
const deleteCharacter = async ({ id }) => {
  try {
    LogModule.log({
      key1: "deleteCharacter",
      key2: "start",
      text1: "Deleting character",
      text2: `Character ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing character ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid character ID format");
    }

    const deletedCharacter = await Character.findByIdAndDelete(id);

    if (!deletedCharacter) {
      throw new Error("Character not found");
    }

    LogModule.log({
      key1: "deleteCharacter",
      key2: "success",
      text1: "Character deleted successfully",
      text2: `Character ID: ${id}`,
    });

    return deletedCharacter;
  } catch (error) {
    LogModule.error({
      key1: "deleteCharacter",
      key2: "failed",
      text1: "Failed to delete character",
      text2: `Character ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default {
  getById,
  create,
  update,
  deleteCharacter,
  getAllCharacters,
};
