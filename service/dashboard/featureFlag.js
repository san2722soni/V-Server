import crypto from "crypto";
import redisClient from "../../db/redis.js";
import FeatureFlag from "../../model/FeatureFlag.js";
import LogModule from "../../service/log/index.js";
import { FeatureFlagTypes } from "../../constants/index.js";

const client = redisClient.client;
const FEATURE_FLAG_KEY = "featureFlags";

// BACKUP FUNCTION - NOW THROWS ERRORS
async function syncToMongoDB(action, data) {
  
  try {
    let result;
    switch (action) {
      case "CREATE":
        result = await FeatureFlag.create({
          name: data.name,
          type: data.type, // Already normalized in calling function
          value: data.value,
          createdBy: data.createdBy,
        });
        break;
      case "UPDATE":
        // Don't pass updatedAt - Mongoose handles it automatically
        result = await FeatureFlag.findOneAndUpdate(
          { name: data.name },
          {
            value: data.value,
            updatedBy: data.updatedBy,
          },
          { new: true, upsert: false }
        );
        break;
      case "DELETE":
        result = await FeatureFlag.findOneAndDelete({ name: data.name });
        break;
    }
    return result;
  } catch (mongoError) {
    
    // logging system
    try {
      LogModule.error({
        key1: "syncToMongoDB",
        key2: "failed",
        text1: `Mongo sync failed for action ${action}`,
        text2: `FeatureFlag: ${data?.name}`,
        error: mongoError?.message,
        stack: mongoError?.stack,
      });
    } catch (e) {
      console.error('❌ Even logging failed:', e.message);
    }
    
    // THROW THE ERROR SO CALLING CODE KNOWS IT FAILED
    throw mongoError;
  }
}

// RECOVERY FUNCTION
async function recoverFromMongoDB(featureFlagName = null) {
  try {
    
    if (featureFlagName) {
      // Recover single feature flag by name
      const featureFlag = await FeatureFlag.findOne({ name: featureFlagName });
      if (featureFlag) {
        const normalizedFlag = normalizeFlag(featureFlag);
        await client.hSet(
          FEATURE_FLAG_KEY,
          featureFlag.name,
          JSON.stringify(normalizedFlag)
        );
        return featureFlag;
      } else {
        console.log(`❌ Flag not found in MongoDB: ${featureFlagName}`);
      }
    } else {
      // Recover all feature flags
      const featureFlags = await FeatureFlag.find({});
      for (const flag of featureFlags) {
        const normalizedFlag = normalizeFlag(flag);
        await client.hSet(
          FEATURE_FLAG_KEY,
          flag.name,
          JSON.stringify(normalizedFlag)
        );
      }
      return featureFlags;
    }
    return null;
  } catch (error) {
    console.error('🚨 RECOVERY FAILED:', error.message);
    return null;
  }
}

// INTERNAL USE: Get feature flag by name
async function getFeatureFlag(name) {
  try {
    // PRIMARY: Get from Redis using name as key
    const featureFlagJson = await client.hGet(FEATURE_FLAG_KEY, name);

    if (featureFlagJson) {
      const flag = JSON.parse(featureFlagJson);
      return convertValueByType(flag.value, flag.type);
    }

    // If not found in Redis, try recovery from MongoDB
    const recoveredFlag = await recoverFromMongoDB(name);
    if (recoveredFlag) {
      return convertValueByType(recoveredFlag.value, recoveredFlag.type);
    }

    console.warn(`Feature flag "${name}" not found`);
    return null;
  } catch (error) {
    console.error(`Error getting feature flag "${name}":`, error.message);
    return null;
  }
}

// Helper function to convert string value to proper type
function convertValueByType(value, type) {
  switch (type) {
    case FeatureFlagTypes.BOOLEAN:
      return value.toLowerCase() === "true";
    case FeatureFlagTypes.INTEGER:
      return parseInt(value, 10);
    case FeatureFlagTypes.STRING:
    default:
      return value;
  }
}

// Normalize Flag - for Redis storage only
function normalizeFlag(flag) {
  return {
    name: flag.name,
    type: flag.type,
    value: flag.value,
    createdBy: flag.createdBy || null,
    createdAt: flag.createdAt || new Date().toISOString(),
    updatedBy: flag.updatedBy || null,
    updatedAt: flag.updatedAt || null,
  };
}

// CREATE - Store in Redis (primary) and backup to MongoDB
async function createFeatureFlag(data) {
  try {
    
    LogModule.log({
      key1: "createFeatureFlag",
      key2: "start",
      text1: "Creating feature flag",
      text2: `Name: ${data.name}`,
    });

    const { name, type, value, userData } = data;

    if (!name || !type || !value) {
      console.error('❌ Validation failed - missing fields');
      LogModule.error({
        key1: "createFeatureFlag",
        key2: "validation_failed",
        text1: "Feature flag validation failed",
        text2: "Missing required fields",
      });
      return {
        success: false,
        message: "Missing required fields: name, type, value",
      };
    }

    // NORMALIZE TYPE - convert to lowercase to match enum
    const normalizedType = type.toLowerCase();
    
    // Validate type against enum
    const validTypes = [FeatureFlagTypes.STRING, FeatureFlagTypes.BOOLEAN, FeatureFlagTypes.INTEGER];
    if (!validTypes.includes(normalizedType)) {
      console.error(`❌ Invalid type: ${normalizedType}, valid types:`, validTypes);
      return {
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      };
    }

    // Check if feature flag with same name already exists in Redis
    const existingFlag = await client.hGet(FEATURE_FLAG_KEY, name);
    if (existingFlag) {
      console.error(`❌ Flag already exists: ${name}`);
      LogModule.error({
        key1: "createFeatureFlag",
        key2: "already_exists",
        text1: "Feature flag already exists",
        text2: `Name: ${name}`,
      });
      return {
        success: false,
        message: "Feature flag with this name already exists",
      };
    }

    const featureFlagData = {
      name: name,
      type: normalizedType, // Use normalized type
      value: value,
      createdBy: userData?.developerId,
      // Don't pass createdAt/updatedAt - let Mongoose timestamps handle it
    };

    const normalizedFlag = {
      ...featureFlagData,
      createdAt: new Date().toISOString(), // For Redis only
      updatedAt: null,
      updatedBy: null,
    };

    // PRIMARY: Store in Redis Hash using name as key
    await client.hSet(
      FEATURE_FLAG_KEY,
      name,
      JSON.stringify(normalizedFlag)
    );

    // BACKUP: Sync to MongoDB - Pass data WITHOUT timestamps
    try {
      const mongoData = {
        name: name,
        type: normalizedType, // Use normalized type
        value: value,
        createdBy: userData?.developerId,
      };
      await syncToMongoDB("CREATE", mongoData);
    } catch (mongoError) {
      console.error('⚠️ MongoDB sync FAILED but Redis succeeded');
      // Redis succeeded, so we still return success but warn about mongo
      LogModule.error({
        key1: "createFeatureFlag",
        key2: "mongo_backup_failed",
        text1: "Feature flag created in Redis but MongoDB backup failed",
        text2: `Name: ${name}`,
        error: mongoError.message,
      });
    }

    LogModule.log({
      key1: "createFeatureFlag",
      key2: "success",
      text1: "Feature flag created successfully",
      text2: `Name: ${name}, Type: ${normalizedType}`,
    });
    return {
      success: true,
      message: "Feature flag created successfully",
      data: normalizedFlag, // Return the normalized flag with timestamps
    };
  } catch (error) {
    console.error('🚨 CREATE FEATURE FLAG FAILED:', error.message);
    console.error('Stack:', error.stack);
    
    LogModule.error({
      key1: "createFeatureFlag",
      key2: "failed",
      text1: "Feature flag creation failed",
      text2: `Name: ${data.name}`,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: error.message,
    };
  }
}

// GET ALL - Read from Redis (primary), recover from MongoDB if empty
async function getFeatureFlags(data) {
  try {
    
    LogModule.log({
      key1: "getFeatureFlags",
      key2: "start",
      text1: "Fetching all feature flags",
      text2: "Process initiated",
    });

    const { userData, query = {} } = data;

    // PRIMARY: Get all from Redis Hash
    const featureFlagsMap = await client.hGetAll(FEATURE_FLAG_KEY);

    let featureFlags = Object.values(featureFlagsMap).map((flag) =>
      JSON.parse(flag)
    );
    // If Redis is empty, try recovery from MongoDB
    if (featureFlags.length === 0) {
      const recoveredFlags = await recoverFromMongoDB();
      featureFlags = recoveredFlags || [];
    }

    LogModule.log({
      key1: "getFeatureFlags",
      key2: "success",
      text1: "Feature flags fetched successfully",
      text2: `Count: ${featureFlags.length}`,
    });
    return {
      success: true,
      data: featureFlags,
      count: featureFlags.length,
    };
  } catch (error) {
    console.error('🚨 GET FEATURE FLAGS FAILED:', error.message);
    
    LogModule.error({
      key1: "getFeatureFlags",
      key2: "failed",
      text1: "Failed to fetch feature flags",
      text2: "Database query failed",
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: error.message,
    };
  }
}

// GET BY NAME - Read from Redis (primary), recover from MongoDB if not found
async function getFeatureFlagByName(data) {
  try {
    const { name, userData } = data;

    LogModule.log({
      key1: "getFeatureFlagByName",
      key2: "start",
      text1: "Fetching feature flag by name",
      text2: `Name: ${name}`,
    });

    if (!name) {
      console.error('❌ Name is required');
      LogModule.error({
        key1: "getFeatureFlagByName",
        key2: "validation_failed",
        text1: "Feature flag validation failed",
        text2: "Name is required",
      });
      return {
        success: false,
        message: "Feature flag name is required",
      };
    }

    // PRIMARY: Get from Redis Hash using name as key
    let featureFlag = await client.hGet(FEATURE_FLAG_KEY, name);

    // If not in Redis, try recovery from MongoDB
    if (!featureFlag) {
      const recoveredFlag = await recoverFromMongoDB(name);

      if (recoveredFlag) {
        const normalizedFlag = normalizeFlag(recoveredFlag);
        featureFlag = JSON.stringify(normalizedFlag);
      }
    } else {
      console.log(`✅ Found in Redis: ${name}`);
    }

    if (!featureFlag) {
      console.error(`❌ Feature flag not found: ${name}`);
      LogModule.error({
        key1: "getFeatureFlagByName",
        key2: "not_found",
        text1: "Feature flag not found",
        text2: `Name: ${name}`,
      });
      return {
        success: false,
        message: "Feature flag not found",
      };
    }

    LogModule.log({
      key1: "getFeatureFlagByName",
      key2: "success",
      text1: "Feature flag fetched successfully",
      text2: `Name: ${name}`,
    });
    return {
      success: true,
      data: JSON.parse(featureFlag),
    };
  } catch (error) {
    console.error(`🚨 GET FEATURE FLAG BY NAME FAILED: ${data.name}`, error.message);
    
    LogModule.error({
      key1: "getFeatureFlagByName",
      key2: "failed",
      text1: "Failed to fetch feature flag",
      text2: `Name: ${data.name}`,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: error.message,
    };
  }
}

// UPDATE - Update in Redis (primary) and backup to MongoDB
async function updateFeatureFlag(data) {
  try {
    const { name, value, userData } = data;

    LogModule.log({
      key1: "updateFeatureFlag",
      key2: "start",
      text1: "Updating feature flag",
      text2: `Name: ${name}`,
    });

    if (!name || !value) {
      console.error('❌ Validation failed - name and value required');
      LogModule.error({
        key1: "updateFeatureFlag",
        key2: "validation_failed",
        text1: "Feature flag validation failed",
        text2: "Name and value are required",
      });
      return {
        success: false,
        message: "Feature flag name and value are required",
      };
    }

    // First check if exists in Redis using name as key
    let existingFlag = await client.hGet(FEATURE_FLAG_KEY, name);

    // If not in Redis, try recovery from MongoDB
    if (!existingFlag) {
      const recoveredFlag = await recoverFromMongoDB(name);

      if (!recoveredFlag) {
        console.error(`❌ Feature flag not found: ${name}`);
        LogModule.error({
          key1: "updateFeatureFlag",
          key2: "not_found",
          text1: "Feature flag not found for update",
          text2: `Name: ${name}`,
        });
        return {
          success: false,
          message: "Feature flag not found",
        };
      }
      const normalizedFlag = normalizeFlag(recoveredFlag);
      existingFlag = JSON.stringify(normalizedFlag);
    }

    const existingData = JSON.parse(existingFlag);

    // ONLY UPDATE VALUE - name and type remain same
    const updatedData = {
      ...existingData,
      value: value,
      updatedBy: userData?.developerId,
      updatedAt: new Date().toISOString(), // For Redis
    };
    // PRIMARY: Update in Redis using name as key
    await client.hSet(FEATURE_FLAG_KEY, name, JSON.stringify(updatedData));

    // BACKUP: Sync to MongoDB - Pass data WITHOUT timestamps
    try {
      const mongoData = {
        name: name,
        value: value,
        updatedBy: userData?.developerId,
        // Don't pass updatedAt - Mongoose timestamps handles it
      };
      await syncToMongoDB("UPDATE", mongoData);
    } catch (mongoError) {
      console.error('⚠️ MongoDB sync FAILED but Redis succeeded');
      LogModule.error({
        key1: "updateFeatureFlag",
        key2: "mongo_backup_failed",
        text1: "Feature flag updated in Redis but MongoDB backup failed",
        text2: `Name: ${name}`,
        error: mongoError.message,
      });
    }

    LogModule.log({
      key1: "updateFeatureFlag",
      key2: "success",
      text1: "Feature flag updated successfully",
      text2: `Name: ${name}, New value: ${value}`,
    });
    return {
      success: true,
      message: "Feature flag updated successfully",
      data: updatedData,
    };
  } catch (error) {
    console.error(`🚨 UPDATE FEATURE FLAG FAILED: ${data.name}`, error.message);
    console.error('Stack:', error.stack);
    
    LogModule.error({
      key1: "updateFeatureFlag",
      key2: "failed",
      text1: "Failed to update feature flag",
      text2: `Name: ${data.name}`,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: error.message,
    };
  }
}

// DELETE - Delete from Redis (primary) and backup to MongoDB
async function deleteFeatureFlag(data) {
  try {
    const { name, userData } = data;

    LogModule.log({
      key1: "deleteFeatureFlag",
      key2: "start",
      text1: "Deleting feature flag",
      text2: `Name: ${name}`,
    });

    if (!name) {
      console.error('❌ Name is required');
      LogModule.error({
        key1: "deleteFeatureFlag",
        key2: "validation_failed",
        text1: "Feature flag validation failed",
        text2: "Name is required",
      });
      return {
        success: false,
        message: "Feature flag name is required",
      };
    }
    // PRIMARY: Delete from Redis using name as key
    const deletedCount = await client.hDel(FEATURE_FLAG_KEY, name);

    if (deletedCount === 0) {
      console.error(`❌ Flag not found in Redis: ${name}`);
      LogModule.error({
        key1: "deleteFeatureFlag",
        key2: "not_found",
        text1: "Feature flag not found for deletion",
        text2: `Name: ${name}`,
      });
      return {
        success: false,
        message: "Feature flag not found",
      };
    }

    // BACKUP: Sync delete to MongoDB
    try {
      await syncToMongoDB("DELETE", { name: name });
    } catch (mongoError) {
      console.error('⚠️ MongoDB sync FAILED but Redis succeeded');
      LogModule.error({
        key1: "deleteFeatureFlag",
        key2: "mongo_backup_failed",
        text1: "Feature flag deleted from Redis but MongoDB backup failed",
        text2: `Name: ${name}`,
        error: mongoError.message,
      });
    }

    LogModule.log({
      key1: "deleteFeatureFlag",
      key2: "success",
      text1: "Feature flag deleted successfully",
      text2: `Name: ${name}`,
    });

    return {
      success: true,
      message: "Feature flag deleted successfully",
    };
  } catch (error) {
    console.error(`🚨 DELETE FEATURE FLAG FAILED: ${data.name}`, error.message);
    console.error('Stack:', error.stack);
    
    LogModule.error({
      key1: "deleteFeatureFlag",
      key2: "failed",
      text1: "Failed to delete feature flag",
      text2: `Name: ${data.name}`,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: error.message,
    };
  }
}

export default {
  createFeatureFlag,
  getFeatureFlags,
  getFeatureFlagByName,
  updateFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlag,
};