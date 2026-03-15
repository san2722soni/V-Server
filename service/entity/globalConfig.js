import GlobalConfig from "../../model/GlobalConfig.js";
import mongoose from "mongoose";
import LogModule from "../log/index.js";

const getAll = async () => {
  try {
    LogModule.log({
      key1: "getAllGlobalConfig",
      key2: "start",
      text1: "Fetching all global config entries",
    });

    const configs = await GlobalConfig.find();

    LogModule.log({
      key1: "getAllGlobalConfig",
      key2: "success",
      text1: "Global config entries fetched successfully",
      text2: `Count: ${configs.length}`,
    });

    return configs;
  } catch (error) {
    LogModule.error({
      key1: "getAllGlobalConfig",
      key2: "failed",
      text1: "Failed to fetch global config entries",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getById = async ({ id }) => {
  try {
    LogModule.log({
      key1: "getGlobalConfigById",
      key2: "start",
      text1: "Fetching global config by ID",
      text2: `ID: ${id || "not provided"}`,
    });

    const cleanId = String(id || "").trim();

    if (cleanId.startsWith("req-")) {
      return await getAll();
    }

    if (!cleanId) {
      return await getAll();
    }

    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return { success: false, message: "Invalid config ID" };
    }

    const config = await GlobalConfig.findById(cleanId);

    if (!config) {
      return { success: false, message: "Config entry not found" };
    }

    return { success: true, data: config };
  } catch (error) {
    LogModule.error({
      key1: "getGlobalConfigById",
      key2: "failed",
      text1: error.message,
      text2: `ID: ${id}`,
      stack: error.stack,
    });
    return { success: false, message: error.message, error };
  }
};

const castValue = (value, valueType) => {
  switch (valueType) {
    case "number":
      return Number(value);
    case "boolean":
      return value === true || value === "true";
    default:
      return String(value);
  }
};

const create = async (data) => {
  try {
    LogModule.log({
      key1: "createGlobalConfig",
      key2: "start",
      text1: "Creating new global config entry",
    });

    if (!data.key || !data.valueType) {
      throw new Error("Missing required fields: key, valueType");
    }

    const existing = await GlobalConfig.findOne({ key: data.key });
    if (existing) {
      throw new Error(`Config key "${data.key}" already exists`);
    }

    const newConfig = await GlobalConfig.create({
      key: data.key,
      value: castValue(data.value, data.valueType),
      valueType: data.valueType,
    });

    LogModule.log({
      key1: "createGlobalConfig",
      key2: "success",
      text1: "Global config entry created successfully",
      text2: `Key: ${data.key}`,
    });

    return newConfig;
  } catch (error) {
    LogModule.error({
      key1: "createGlobalConfig",
      key2: "failed",
      text1: "Failed to create global config entry",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const update = async ({ id, updates }) => {
  try {
    LogModule.log({
      key1: "updateGlobalConfig",
      key2: "start",
      text1: "Updating global config entry",
      text2: `ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing config ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid config ID format");
    }

    const existing = await GlobalConfig.findById(id);
    if (!existing) {
      throw new Error("Config entry not found");
    }

    const valueType = updates.valueType || existing.valueType;
    const setData = { ...updates };
    if ("value" in updates) {
      setData.value = castValue(updates.value, valueType);
    }

    const updatedConfig = await GlobalConfig.findByIdAndUpdate(id, {
      $set: setData,
    });

    LogModule.log({
      key1: "updateGlobalConfig",
      key2: "success",
      text1: "Global config entry updated successfully",
      text2: `ID: ${id}`,
    });

    return updatedConfig;
  } catch (error) {
    LogModule.error({
      key1: "updateGlobalConfig",
      key2: "failed",
      text1: "Failed to update global config entry",
      text2: `ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteConfig = async ({ id }) => {
  try {
    LogModule.log({
      key1: "deleteGlobalConfig",
      key2: "start",
      text1: "Deleting global config entry",
      text2: `ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing config ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid config ID format");
    }

    const deletedConfig = await GlobalConfig.findByIdAndDelete(id);

    if (!deletedConfig) {
      throw new Error("Config entry not found");
    }

    LogModule.log({
      key1: "deleteGlobalConfig",
      key2: "success",
      text1: "Global config entry deleted successfully",
      text2: `ID: ${id}`,
    });

    return deletedConfig;
  } catch (error) {
    LogModule.error({
      key1: "deleteGlobalConfig",
      key2: "failed",
      text1: "Failed to delete global config entry",
      text2: `ID: ${id}`,
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
  deleteConfig,
  getAll,
};
