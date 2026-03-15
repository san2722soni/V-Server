import Building from "../../model/Building.js";
import mongoose from "mongoose";
import LogModule from "../log/index.js";

const getAllBuildings = async ({ isActive } = {}) => {
  try {
    LogModule.log({
      key1: "getAllBuildings",
      key2: "start",
      text1: "Fetching all buildings",
    });

    const filter = {};
    if (isActive) filter.isActive = true;

    const buildings = await Building.find(filter);

    if (!buildings || buildings.length === 0) {
      throw new Error("No buildings found");
    }

    LogModule.log({
      key1: "getAllBuildings",
      key2: "success",
      text1: "All buildings fetched successfully",
      text2: `Count: ${buildings.length}`,
    });

    return buildings;
  } catch (error) {
    LogModule.error({
      key1: "getAllBuildings",
      key2: "failed",
      text1: "Failed to fetch all buildings",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getById = async ({ id }) => {
  try {
    LogModule.log({
      key1: "getBuildingById",
      key2: "start",
      text1: "Fetching building by ID",
      text2: `Building ID: ${id || "not provided"}`,
    });

    const cleanId = String(id || "").trim();

    if (cleanId.startsWith("req-")) {
      return await getAllBuildings();
    }

    if (!cleanId) {
      return await getAllBuildings();
    }

    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return { success: false, message: "Invalid building ID" };
    }

    const building = await Building.findById(cleanId);

    if (!building) {
      return { success: false, message: "No building found with this ID" };
    }

    return { success: true, data: building };
  } catch (error) {
    LogModule.error({
      key1: "getBuildingById",
      key2: "failed",
      text1: error.message,
      text2: `Building ID: ${id}`,
      stack: error.stack,
    });
    return { success: false, message: error.message, error };
  }
};

const create = async (data) => {
  try {
    LogModule.log({
      key1: "createBuilding",
      key2: "start",
      text1: "Creating new building",
    });

    const requiredFields = ["health", "storage", "name"];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    const { health, attack, storage, level, name, abilities, isActive } = data;

    const newBuilding = await Building.create({
      health,
      attack,
      storage,
      level,
      name,
      abilities,
      isActive,
    });

    LogModule.log({
      key1: "createBuilding",
      key2: "success",
      text1: "Building created successfully",
      text2: `Building ID: ${newBuilding._id}`,
    });

    return newBuilding;
  } catch (error) {
    LogModule.error({
      key1: "createBuilding",
      key2: "failed",
      text1: "Failed to create building",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const update = async ({ id, updates }) => {
  try {
    LogModule.log({
      key1: "updateBuilding",
      key2: "start",
      text1: "Updating building",
      text2: `Building ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing building ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid building ID format");
    }

    const updatedBuilding = await Building.findByIdAndUpdate(id, {
      $set: updates,
    });

    if (!updatedBuilding) {
      throw new Error("Building not found");
    }

    LogModule.log({
      key1: "updateBuilding",
      key2: "success",
      text1: "Building updated successfully",
      text2: `Building ID: ${id}`,
    });

    return updatedBuilding;
  } catch (error) {
    LogModule.error({
      key1: "updateBuilding",
      key2: "failed",
      text1: "Failed to update building",
      text2: `Building ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteBuilding = async ({ id }) => {
  try {
    LogModule.log({
      key1: "deleteBuilding",
      key2: "start",
      text1: "Deleting building",
      text2: `Building ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing building ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid building ID format");
    }

    const deletedBuilding = await Building.findByIdAndDelete(id);

    if (!deletedBuilding) {
      throw new Error("Building not found");
    }

    LogModule.log({
      key1: "deleteBuilding",
      key2: "success",
      text1: "Building deleted successfully",
      text2: `Building ID: ${id}`,
    });

    return deletedBuilding;
  } catch (error) {
    LogModule.error({
      key1: "deleteBuilding",
      key2: "failed",
      text1: "Failed to delete building",
      text2: `Building ID: ${id}`,
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
  deleteBuilding,
  getAllBuildings,
};
