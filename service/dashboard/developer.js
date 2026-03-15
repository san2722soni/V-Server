import jwt from "jsonwebtoken";
import Developer from "../../model/Developer.js";
import LogModule from "../../service/log/index.js";
import { generateRefreshToken } from "../auth/utils.js";
import { REFRESH_TOKEN_EXPIRE_TIME } from "../../constants/index.js";

const createDeveloper = async (data) => {
  try {
    LogModule.log({
      key1: "createDeveloper",
      key2: "start",
      text1: "Developer creation started",
      text2: `Email: ${data.email}`,
    });

    const { email, name, role, gender, permission, isAdmin, access } = data;

    // Validate required fields
    if (!name) throw new Error("Name is required");
    if (!email) throw new Error("Email is required");
    if (!role) throw new Error("Role is required");
    if (!gender) throw new Error("Gender is required");
    if (!permission) throw new Error("Permissions are required");

    const existingDeveloper = await Developer.findOne({ email });
    if (existingDeveloper) {
      throw new Error("Developer with this email already exists");
    }

    // Generate refresh token and expiry
    let refreshToken = generateRefreshToken();
    const tokenEAT = Date.now() + REFRESH_TOKEN_EXPIRE_TIME;

    // Create new developer
    const newDeveloper = await Developer.create({
      email,
      refreshToken,
      tokenEAT,
      isAdmin: isAdmin || false,
      access: access || [], // Array of access strings
      profile: {
        name,
        role,
        gender,
        permissions: permission,
      },
    });

    if (!newDeveloper || !newDeveloper._id) {
      throw new Error("Failed to create developer!");
    }

    LogModule.log({
      key1: "createDeveloper",
      key2: "success",
      text1: "Developer created successfully",
      text2: `Developer ID: ${newDeveloper._id}`,
    });

    return {
      success: true,
      message: "Developer created successfully",
      data: newDeveloper,
    };
  } catch (error) {
    LogModule.error({
      key1: "createDeveloper",
      key2: "failed",
      text1: "Developer creation failed",
      text2: `Email: ${data.email}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getDevelopers = async (data) => {
  try {
    LogModule.log({
      key1: "getDevelopers",
      key2: "start",
      text1: "Fetching all developers",
      text2: "Process initiated",
    });

    const developers = await Developer.find();

    if (!developers || developers.length === 0) {
      throw new Error("No developers found");
    }

    const safeDevelopers = developers.map((dev) => {
      const { refreshToken, tokenEAT, ...safeData } = dev.toObject();
      return safeData;
    });

    LogModule.log({
      key1: "getDevelopers",
      key2: "success",
      text1: "Developers fetched successfully",
      text2: `Count: ${safeDevelopers.length}`,
    });

    return {
      success: true,
      data: safeDevelopers,
      count: safeDevelopers.length,
    };
  } catch (error) {
    LogModule.error({
      key1: "getDevelopers",
      key2: "failed",
      text1: "Failed to fetch developers",
      text2: "Database query failed",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getDeveloper = async (data) => {
  try {
    const { id } = data;

    LogModule.log({
      key1: "getDeveloper",
      key2: "start",
      text1: "Fetching developer by ID",
      text2: `Developer ID: ${id}`,
    });

    if (!id) {
      throw new Error("Developer ID is required");
    }

    const developer = await Developer.findById(id);

    if (!developer) {
      throw new Error("Developer not found");
    }

    const { refreshToken, tokenEAT, ...safeDeveloper } = developer.toObject();

    LogModule.log({
      key1: "getDeveloper",
      key2: "success",
      text1: "Developer fetched successfully",
      text2: `Developer ID: ${id}`,
    });

    return {
      success: true,
      data: safeDeveloper,
    };
  } catch (error) {
    LogModule.error({
      key1: "getDeveloper",
      key2: "failed",
      text1: "Failed to fetch developer",
      text2: `Developer ID: ${data.id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const updateDeveloper = async (data) => {
  try {
    const { id, name, role, gender, permission, isAdmin, access } = data;

    LogModule.log({
      key1: "updateDeveloper",
      key2: "start",
      text1: "Updating developer",
      text2: `Developer ID: ${id}`,
    });

    if (!id) {
      throw new Error("Developer ID is required");
    }

    const existingDeveloper = await Developer.findById(id);
    if (!existingDeveloper) {
      throw new Error("Developer not found");
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData["profile.name"] = name;
    if (role) updateData["profile.role"] = role;
    if (gender) updateData["profile.gender"] = gender;
    if (permission) updateData["profile.permissions"] = permission;
    if (typeof isAdmin !== "undefined") updateData.isAdmin = isAdmin;
    if (access) updateData.access = access;

    const updatedDeveloper = await Developer.findByIdAndUpdate(id, updateData);

    // Remove sensitive fields
    const { refreshToken, tokenEAT, ...safeDeveloper } =
      updatedDeveloper.toObject();

    LogModule.log({
      key1: "updateDeveloper",
      key2: "success",
      text1: "Developer updated successfully",
      text2: `Developer ID: ${id}`,
    });

    return {
      success: true,
      message: "Developer updated successfully",
      data: safeDeveloper,
    };
  } catch (error) {
    LogModule.error({
      key1: "updateDeveloper",
      key2: "failed",
      text1: "Failed to update developer",
      text2: `Developer ID: ${data.id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteDeveloper = async (data) => {
  try {
    const { id } = data;

    LogModule.log({
      key1: "deleteDeveloper",
      key2: "start",
      text1: "Deleting developer",
      text2: `Developer ID: ${id}`,
    });

    if (!id) {
      throw new Error("Developer ID is required");
    }

    const deletedDeveloper = await Developer.findByIdAndDelete(id);

    if (!deletedDeveloper) {
      throw new Error("Developer not found");
    }

    LogModule.log({
      key1: "deleteDeveloper",
      key2: "success",
      text1: "Developer deleted successfully",
      text2: `Developer ID: ${id}`,
    });

    return {
      success: true,
      message: "Developer deleted successfully",
      data: { id: deletedDeveloper._id, email: deletedDeveloper.email },
    };
  } catch (error) {
    LogModule.error({
      key1: "deleteDeveloper",
      key2: "failed",
      text1: "Failed to delete developer",
      text2: `Developer ID: ${data.id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// CHECK ACCESS - Check if developer has specific access
const checkDeveloperAccess = async (developerId, requiredAccess) => {
  try {
    LogModule.log({
      key1: "checkDeveloperAccess",
      key2: "start",
      text1: "Checking developer access",
      text2: `Developer ID: ${developerId}, Required: ${requiredAccess}`,
    });

    const developer = await Developer.findById(developerId);

    if (!developer) {
      return { hasAccess: false, message: "Developer not found" };
    }

    // Check if developer has the required access in their access array
    const hasAccess = developer.access.includes(requiredAccess);

    LogModule.log({
      key1: "checkDeveloperAccess",
      key2: hasAccess ? "granted" : "denied",
      text1: "Access check completed",
      text2: `Developer ID: ${developerId}, Access: ${hasAccess}`,
    });

    return {
      hasAccess,
      message: hasAccess ? "Access granted" : "Access denied",
    };
  } catch (error) {
    LogModule.error({
      key1: "checkDeveloperAccess",
      key2: "failed",
      text1: "Access check failed",
      text2: `Developer ID: ${developerId}`,
      error: error.message,
      stack: error.stack,
    });
    return { hasAccess: false, message: error.message };
  }
};

export default {
  createDeveloper,
  getDevelopers,
  getDeveloper,
  updateDeveloper,
  deleteDeveloper,
  checkDeveloperAccess,
};
