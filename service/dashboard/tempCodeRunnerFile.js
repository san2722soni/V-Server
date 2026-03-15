import ClientBuild from "../../model/ClientBuild.js";
import { exec } from "child_process";
import config from "../../constants/config.js";
import redis from "../../db/redis.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const redisClient = redis.client;

import LogModule from "../../service/log/index.js";

const clientServerIP = config.UNITY_SERVER_IP;
const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = config;

const CLIENT_BUILD_STATUS_KEY = "client_build_status";

// Initialize S3 Client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const createBuild = async (data) => {
  try {
    LogModule.log({
      key1: "createClientBuild",
      key2: "start",
      text1: "Client Build creation started",
      text2: "Process initiated",
    });

    // Check Redis for current build status
    const currentStatus = await redisClient.get(CLIENT_BUILD_STATUS_KEY);

    if (currentStatus === "building") {
      LogModule.error({
        key1: "createClientBuild",
        key2: "build_in_progress",
        text1: "Build already in progress",
        text2: "Cannot start new build",
      });
      return {
        success: false,
        message: "Client Build already in progress",
      };
    }

    const { message, userData } = data;
    const userId = userData?.userId || "";

    if (!message) {
      LogModule.error({
        key1: "createClientBuild",
        key2: "validation_failed",
        text1: "Build creation validation failed",
        text2: "Message is required",
      });
      return { success: false, message: "Message is required" };
    }

    const totalBuild = await ClientBuild.countDocuments();
    const version = `v${totalBuild + 1}`;

    const newBuild = await ClientBuild.create({
      version: version,
      message,
    });

    if (!newBuild) {
      LogModule.error({
        key1: "createClientBuild",
        key2: "creation_failed",
        text1: "Build creation failed in database",
        text2: `Version: ${version}`,
      });
      return { success: false, message: "Failed to create build" };
    }

    // Set Redis status to building
    await redisClient.set(CLIENT_BUILD_STATUS_KEY, "building");
    await redisClient.set(`${CLIENT_BUILD_STATUS_KEY}:version`, version);
    await redisClient.set(
      `${CLIENT_BUILD_STATUS_KEY}:buildId`,
      newBuild._id.toString(),
    );

    // Making build in AWS server
    exec(
      `ssh ubuntu@${clientServerIP} "nohup /home/ubuntu/scripts/buildClient.sh ${version} > /home/ubuntu/build.log 2>&1 &"`,
      async (err, stdout, stderr) => {
        if (err) {
          LogModule.error({
            key1: "createClientBuild",
            key2: "ssh_error",
            text1: "SSH command failed",
            text2: err.message,
            error: err.message,
            stack: err.stack,
          });

          // Reset Redis AND update database
          await Promise.all([
            redisClient.set(CLIENT_BUILD_STATUS_KEY, "idle"),
            ClientBuild.findByIdAndUpdate(newBuild._id, {
              buildFailed: true,
              failedAt: new Date(),
              errorMessage: "SSH connection failed: " + err.message,
            }),
          ]);

          return console.error(err);
        }
        console.log(stdout);
      },
    );

    LogModule.log({
      key1: "createClientBuild",
      key2: "success",
      text1: "Build created successfully",
      text2: `Version: ${version}, Build ID: ${newBuild._id}`,
    });

    return {
      success: true,
      message: "Build created successfully",
      data: newBuild,
    };
  } catch (err) {
    LogModule.error({
      key1: "createClientBuild",
      key2: "error",
      text1: "Build creation error",
      text2: err.message,
      error: err.message,
      stack: err.stack,
    });
    return {
      success: false,
      message: err.message || "Failed to create build",
    };
  }
};

const getBuilds = async () => {
  try {
    LogModule.log({
      key1: "getClientBuilds",
      key2: "start",
      text1: "Fetching all client builds",
      text2: "Process initiated",
    });

    const builds = await ClientBuild.find({ isDeleted: false });

    if (!builds || builds.length === 0) {
      LogModule.log({
        key1: "getClientBuilds",
        key2: "no_builds",
        text1: "No builds found",
        text2: "Database returned empty result",
      });
      return { success: false, message: "No builds found" };
    }

    LogModule.log({
      key1: "getClientBuilds",
      key2: "success",
      text1: "Builds retrieved successfully",
      text2: `Count: ${builds.length}`,
    });

    return {
      success: true,
      message: "Builds retrieved successfully",
      data: builds,
    };
  } catch (error) {
    LogModule.error({
      key1: "getClientBuilds",
      key2: "failed",
      text1: "Failed to fetch builds",
      text2: "Database query failed",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteBuild = async (data) => {
  try {
    const { buildId, userData } = data;
    const userId = userData?.userId;

    LogModule.log({
      key1: "deleteClientBuild",
      key2: "start",
      text1: "Build deletion started",
      text2: `Build ID: ${buildId}`,
    });

    if (!buildId) {
      LogModule.error({
        key1: "deleteClientBuild",
        key2: "validation_failed",
        text1: "Build deletion validation failed",
        text2: "Build ID is required",
      });
      return { success: false, message: "Build ID is required" };
    }

    const getBuild = await ClientBuild.findById({ _id: buildId });

    if (!getBuild) {
      LogModule.error({
        key1: "deleteClientBuild",
        key2: "not_found",
        text1: "Build not found for deletion",
        text2: `Build ID: ${buildId}`,
      });
      return { success: false, message: "No build found with that ID" };
    }

    // Mark DB record as deleted
    await ClientBuild.findByIdAndUpdate(buildId, { isDeleted: true });

    // Deleting build in AWS server
    exec(
      `aws s3 rm s3://project-v-client-builds/${getBuild.version}/ --recursive`,
      (err, stdout, stderr) => {
        if (err) {
          LogModule.error({
            key1: "deleteClientBuild",
            key2: "s3_delete_error",
            text1: "S3 deletion failed",
            text2: err.message,
            error: err.message,
            stack: err.stack,
          });
          return console.error(err);
        }
        console.log(stdout);
      },
    );

    LogModule.log({
      key1: "deleteClientBuild",
      key2: "success",
      text1: "Build deleted successfully",
      text2: `Build ID: ${buildId}, Version: ${getBuild.version}`,
    });

    return {
      success: true,
      message: "Build marked as deleted successfully",
    };
  } catch (error) {
    LogModule.error({
      key1: "deleteClientBuild",
      key2: "failed",
      text1: "Build deletion failed",
      text2: `Build ID: ${data.buildId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const setActiveBuild = async (data) => {
  try {
    const { buildId, userData } = data;
    const userId = userData?.userId;

    LogModule.log({
      key1: "setActiveClientBuild",
      key2: "start",
      text1: "Setting active build",
      text2: `Build ID: ${buildId}`,
    });

    if (!buildId) {
      LogModule.error({
        key1: "setActiveClientBuild",
        key2: "validation_failed",
        text1: "Active build validation failed",
        text2: "Build ID is required",
      });
      return { success: false, message: "Build ID is required" };
    }

    // First, set all builds to inactive
    await ClientBuild.updateMany(
      { isDeleted: false },
      { $set: { isActive: false } },
    );

    // Then, set the selected build to active
    const result = await ClientBuild.findByIdAndUpdate(
      buildId,
      { $set: { isActive: true } },
      { new: true },
    );

    if (!result) {
      LogModule.error({
        key1: "setActiveClientBuild",
        key2: "not_found",
        text1: "Build not found for activation",
        text2: `Build ID: ${buildId}`,
      });
      return { success: false, message: "No build found with that ID" };
    }

    LogModule.log({
      key1: "setActiveClientBuild",
      key2: "success",
      text1: "Build set as active successfully",
      text2: `Build ID: ${buildId}, Version: ${result.version}`,
    });

    return {
      success: true,
      message: "Build set to active successfully",
      data: result,
    };
  } catch (error) {
    LogModule.error({
      key1: "setActiveClientBuild",
      key2: "failed",
      text1: "Failed to set active build",
      text2: `Build ID: ${data.buildId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// This endpoint will be called by the build server via curl after build completion
const buildStatus = async (data) => {
  try {
    const { version, status, error } = data;

    LogModule.log({
      key1: "clientBuildStatus",
      key2: "received",
      text1: "Build status update received",
      text2: `Version: ${version}, Status: ${status}`,
    });

    if (!version || !status) {
      LogModule.error({
        key1: "clientBuildStatus",
        key2: "validation_failed",
        text1: "Build status validation failed",
        text2: "Version and status are required",
      });
      return { success: false, message: "Version and status are required" };
    }

    // Get current version from Redis (but don't fail if missing)
    const currentVersion = await redisClient.get(
      `${CLIENT_BUILD_STATUS_KEY}:version`,
    );

    // Only validate version match if we have a currentVersion in Redis
    if (currentVersion && currentVersion !== version) {
      LogModule.error({
        key1: "clientBuildStatus",
        key2: "version_mismatch",
        text1: "Version mismatch",
        text2: `Expected: ${currentVersion}, Received: ${version}`,
      });
      return { success: false, message: "Version mismatch" };
    }

    // Get buildId from Redis (might be null if Redis was cleared)
    const buildId = await redisClient.get(`${CLIENT_BUILD_STATUS_KEY}:buildId`);

    // If no buildId in Redis, try to find build by version in database
    let actualBuildId = buildId;
    if (!actualBuildId) {
      const build = await ClientBuild.findOne({ version, isDeleted: false });
      if (build) {
        actualBuildId = build._id.toString();
        LogModule.log({
          key1: "clientBuildStatus",
          key2: "build_found_by_version",
          text1: "Found build by version in database",
          text2: `Version: ${version}, Build ID: ${actualBuildId}`,
        });
      }
    }

    // Update Redis status
    await redisClient.set(CLIENT_BUILD_STATUS_KEY, status);

    if (status === "done") {
      // Update database build status
      if (actualBuildId) {
        await ClientBuild.findByIdAndUpdate(actualBuildId, {
          $set: { buildCompleted: true, completedAt: new Date() },
        });

        LogModule.log({
          key1: "clientBuildStatus",
          key2: "completed",
          text1: "Build completed successfully",
          text2: `Version: ${version}, Build ID: ${actualBuildId}`,
        });
      } else {
        LogModule.error({
          key1: "clientBuildStatus",
          key2: "build_not_found",
          text1: "Build completed but no build record found",
          text2: `Version: ${version}`,
        });
      }

      // Clean up Redis keys after successful completion
      await Promise.all([
        redisClient.del(`${CLIENT_BUILD_STATUS_KEY}:version`),
        redisClient.del(`${CLIENT_BUILD_STATUS_KEY}:buildId`),
      ]);
    } else if (status === "failed") {
      // Update database build status
      if (actualBuildId) {
        await ClientBuild.findByIdAndUpdate(actualBuildId, {
          $set: {
            buildFailed: true,
            failedAt: new Date(),
            errorMessage: error || "Build failed",
          },
        });

        LogModule.error({
          key1: "clientBuildStatus",
          key2: "failed",
          text1: "Build failed",
          text2: `Version: ${version}, Build ID: ${actualBuildId}, Error: ${error || "Unknown"}`,
        });
      } else {
        LogModule.error({
          key1: "clientBuildStatus",
          key2: "build_not_found_on_failure",
          text1: "Build failed but no build record found",
          text2: `Version: ${version}, Error: ${error || "Unknown"}`,
        });
      }

      // Clean up Redis keys after failure
      await Promise.all([
        redisClient.del(`${CLIENT_BUILD_STATUS_KEY}:version`),
        redisClient.del(`${CLIENT_BUILD_STATUS_KEY}:buildId`),
      ]);
    }

    return {
      success: true,
      message: "Build status updated successfully",
    };
  } catch (err) {
    LogModule.error({
      key1: "clientBuildStatus",
      key2: "error",
      text1: "Build status update error",
      text2: err.message,
      error: err.message,
      stack: err.stack,
    });
    return {
      success: false,
      message: err.message || "Failed to update build status",
    };
  }
};

// Get current build status from Redis
const getCurrentBuildStatus = async () => {
  try {
    const status = await redisClient.get(CLIENT_BUILD_STATUS_KEY);
    const version = await redisClient.get(`${CLIENT_BUILD_STATUS_KEY}:version`);
    const buildId = await redisClient.get(`${CLIENT_BUILD_STATUS_KEY}:buildId`);

    return {
      success: true,
      data: {
        status: status || "idle",
        version: version || null,
        buildId: buildId || null,
      },
    };
  } catch (error) {
    LogModule.error({
      key1: "getCurrentClientBuildStatus",
      key2: "error",
      text1: "Failed to get build status",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: "Failed to get build status",
    };
  }
};

// Get build logs from S3
const getBuildLogs = async (data) => {
  try {
    const { buildId } = data;

    if (!buildId) {
      LogModule.error({
        key1: "getClientBuildLogs",
        key2: "validation_failed",
        text1: "Build ID is required",
        text2: "No buildId provided",
      });
      return { success: false, message: "Build ID is required" };
    }

    const build = await ClientBuild.findById(buildId);

    if (!build) {
      LogModule.error({
        key1: "getClientBuildLogs",
        key2: "not_found",
        text1: "Build not found",
        text2: `Build ID: ${buildId}`,
      });
      return { success: false, message: "Build not found" };
    }

    const { version } = build;

    // Fetch logs from S3 using AWS SDK
    const command = new GetObjectCommand({
      Bucket: "project-v-client-builds",
      Key: `${version}/build.log`,
    });

    const response = await s3Client.send(command);

    // Convert stream to string
    const logs = await response.Body.transformToString();

    LogModule.log({
      key1: "getClientBuildLogs",
      key2: "success",
      text1: "Logs retrieved successfully from S3",
      text2: `Version: ${version}, Build ID: ${buildId}`,
    });

    return {
      success: true,
      message: "Logs retrieved successfully",
      data: { logs, version, buildId },
    };
  } catch (error) {
    LogModule.error({
      key1: "getClientBuildLogs",
      key2: "error",
      text1: "Failed to fetch logs from S3",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });

    // Check if it's a NoSuchKey error (file doesn't exist)
    if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
      return {
        success: false,
        message:
          "Build log not found. Build may still be in progress or failed before logs were uploaded.",
      };
    }

    return {
      success: false,
      message: "Failed to fetch logs from S3. Please try again later.",
    };
  }
};

export default {
  createBuild,
  getBuilds,
  deleteBuild,
  setActiveBuild,
  buildStatus,
  getCurrentBuildStatus,
  getBuildLogs,
};
