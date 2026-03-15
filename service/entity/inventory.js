import Inventory from "../../model/Inventory.js";
import mongoose from "mongoose";
import LogModule from "../log/index.js";

const getAllInventory = async ({ isActive } = {}) => {
  try {
    LogModule.log({
      key1: "getAllInventory",
      key2: "start",
      text1: "Fetching all inventory items",
    });

    const filter = {};
    if (isActive) filter.isActive = true;

    const items = await Inventory.find(filter);

    if (!items || items.length === 0) {
      throw new Error("No inventory items found");
    }

    LogModule.log({
      key1: "getAllInventory",
      key2: "success",
      text1: "All inventory items fetched successfully",
      text2: `Count: ${items.length}`,
    });

    return items;
  } catch (error) {
    LogModule.error({
      key1: "getAllInventory",
      key2: "failed",
      text1: "Failed to fetch all inventory items",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getById = async ({ id }) => {
  try {
    LogModule.log({
      key1: "getInventoryById",
      key2: "start",
      text1: "Fetching inventory item by ID",
      text2: `Item ID: ${id || "not provided"}`,
    });

    const cleanId = String(id || "").trim();

    if (cleanId.startsWith("req-")) {
      return await getAllInventory();
    }

    if (!cleanId) {
      return await getAllInventory();
    }

    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return { success: false, message: "Invalid inventory item ID" };
    }

    const item = await Inventory.findById(cleanId);

    if (!item) {
      return { success: false, message: "No inventory item found with this ID" };
    }

    return { success: true, data: item };
  } catch (error) {
    LogModule.error({
      key1: "getInventoryById",
      key2: "failed",
      text1: error.message,
      text2: `Item ID: ${id}`,
      stack: error.stack,
    });
    return { success: false, message: error.message, error };
  }
};

const create = async (data) => {
  try {
    LogModule.log({
      key1: "createInventory",
      key2: "start",
      text1: "Creating new inventory item",
    });

    if (!data.name) {
      throw new Error("Missing required field: name");
    }

    const { name, attack, health, range, duration, round, storageCost, purchaseCost, abilities, isActive } = data;

    const newItem = await Inventory.create({
      name,
      attack,
      health,
      range,
      duration,
      round,
      storageCost,
      purchaseCost,
      abilities,
      isActive,
    });

    LogModule.log({
      key1: "createInventory",
      key2: "success",
      text1: "Inventory item created successfully",
      text2: `Item ID: ${newItem._id}`,
    });

    return newItem;
  } catch (error) {
    LogModule.error({
      key1: "createInventory",
      key2: "failed",
      text1: "Failed to create inventory item",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const update = async ({ id, updates }) => {
  try {
    LogModule.log({
      key1: "updateInventory",
      key2: "start",
      text1: "Updating inventory item",
      text2: `Item ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing inventory item ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid inventory item ID format");
    }

    const updatedItem = await Inventory.findByIdAndUpdate(id, {
      $set: updates,
    });

    if (!updatedItem) {
      throw new Error("Inventory item not found");
    }

    LogModule.log({
      key1: "updateInventory",
      key2: "success",
      text1: "Inventory item updated successfully",
      text2: `Item ID: ${id}`,
    });

    return updatedItem;
  } catch (error) {
    LogModule.error({
      key1: "updateInventory",
      key2: "failed",
      text1: "Failed to update inventory item",
      text2: `Item ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteInventory = async ({ id }) => {
  try {
    LogModule.log({
      key1: "deleteInventory",
      key2: "start",
      text1: "Deleting inventory item",
      text2: `Item ID: ${id}`,
    });

    if (!id) {
      throw new Error("Missing inventory item ID");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid inventory item ID format");
    }

    const deletedItem = await Inventory.findByIdAndDelete(id);

    if (!deletedItem) {
      throw new Error("Inventory item not found");
    }

    LogModule.log({
      key1: "deleteInventory",
      key2: "success",
      text1: "Inventory item deleted successfully",
      text2: `Item ID: ${id}`,
    });

    return deletedItem;
  } catch (error) {
    LogModule.error({
      key1: "deleteInventory",
      key2: "failed",
      text1: "Failed to delete inventory item",
      text2: `Item ID: ${id}`,
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
  deleteInventory,
  getAllInventory,
};
