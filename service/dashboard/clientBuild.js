import ClientBuild from "../../model/ClientBuild.js";
import { exec } from "child_process";
import config from "../../constants/config.js";
import redis from "../../db/redis.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import ec2Manager from "../ec2/ec2manager.js";
import autoShutdown from "../ec2/autoShutdown.js";

const redisClient = redis.client;

import LogModule from "../../service/log/index.js";

const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CLOUDFRONT_URL } = config;

const CLIENT_BUILD_STATUS_KEY = "client_build_status";
const BUILD_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes timeout

// Initialize S3 Client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Helper function to get all build status data from Redis hash
const getBuildStatusFromRedis = async () => {
  try {
    const data = await redisClient.hGetAll(CLIENT_BUILD_STATUS_KEY);
    
    // Return null values if hash doesn't exist or is empty
    if (!data || Object.keys(data).length === 0) {
      return {
        status: null,
        version: null,
        buildId: null,
        startTime: null,
        endTime: null,
        platform: null,
      };
    }

    return {
      status: data.status || null,
      version: data.version || null,
      buildId: data.buildId || null,
      startTime: data.startTime ? parseInt(data.startTime) : null,
      endTime: data.endTime ? parseInt(data.endTime) : null,
      platform: data.platform || null,
    };
  } catch (error) {
    LogModule.error({
      key1: "getBuildStatusFromRedis",
      key2: "error",
      text1: "Failed to get client build status from Redis",
      text2: error.message,
    });
    return {
      status: null,
      version: null,
      buildId: null,
      startTime: null,
      endTime: null,
      platform: null,
    };
  }
};

// Helper function to set Redis to idle state with endTime
const setRedisIdle = async () => {
  await redisClient.hSet(CLIENT_BUILD_STATUS_KEY, {
    status: "idle",
    endTime: Date.now().toString(),
  });
  
  // Delete fields that are no longer needed
  await redisClient.hDel(CLIENT_BUILD_STATUS_KEY, [
    "version",
    "buildId",
    "startTime",
    "platform",
  ]);

  // Schedule instance shutdown after 5 minutes
  await autoShutdown.scheduleShutdown();
};

// Helper function to clean up Redis hash completely
const cleanupRedisKeys = async () => {
  await redisClient.del(CLIENT_BUILD_STATUS_KEY);
};

// Check if a build has timed out
const checkBuildTimeout = async () => {
  try {
    const { status, startTime, buildId } = await getBuildStatusFromRedis();

    if (status === "building" && startTime) {
      const elapsed = Date.now() - startTime;

      if (elapsed > BUILD_TIMEOUT_MS) {
        LogModule.error({
          key1: "checkClientBuildTimeout",
          key2: "timeout_detected",
          text1: "Client build timed out",
          text2: `Build has been running for ${Math.round(elapsed / 60000)} minutes`,
        });

        // Mark build as failed in database
        if (buildId) {
          await ClientBuild.findByIdAndUpdate(buildId, {
            buildFailed: true,
            failedAt: new Date(),
            errorMessage: "Build timed out after 30 minutes",
          });
        }

        // Reset Redis to idle
        await setRedisIdle();

        return true;
      }
    }
    return false;
  } catch (error) {
    LogModule.error({
      key1: "checkClientBuildTimeout",
      key2: "error",
      text1: "Error checking client build timeout",
      text2: error.message,
    });
    return false;
  }
};

const createBuild = async (data) => {
  try {
    LogModule.log({
      key1: "createClientBuild",
      key2: "start",
      text1: "Client Build creation started",
      text2: "Process initiated",
    });

    // Check for timeout before checking status
    await checkBuildTimeout();

    // Check Redis for current build status
    const currentBuildStatus = await getBuildStatusFromRedis();

    if (
      currentBuildStatus.status === "building" ||
      currentBuildStatus.status === "startingInstance" ||
      currentBuildStatus.status === "instanceReady"
    ) {
      LogModule.error({
        key1: "createClientBuild",
        key2: "build_in_progress",
        text1: "Build already in progress",
        text2: `Current status: ${currentBuildStatus.status}`,
      });
      return {
        success: false,
        message: `Client Build already in progress (${currentBuildStatus.status})`,
      };
    }

    const { message, userData, platform, releaseType = "release", buildFormat } = data;
    const userId = userData?.userId || "";

    if (!platform || !["windows", "android"].includes(platform)) {
      LogModule.error({
        key1: "createClientBuild",
        key2: "validation_failed",
        text1: "Build creation validation failed",
        text2: "Valid platform is required (windows or android)",
      });
      return { success: false, message: "Valid platform is required (windows or android)" };
    }

    if (!message) {
      LogModule.error({
        key1: "createClientBuild",
        key2: "validation_failed",
        text1: "Build creation validation failed",
        text2: "Message is required",
      });
      return { success: false, message: "Message is required" };
    }

    if (platform === "android" && buildFormat && !["apk", "aab"].includes(buildFormat)) {
      return { success: false, message: "Valid build format is required for Android (apk or aab)" };
    }

    const totalBuild = await ClientBuild.countDocuments();
    const version = `v${totalBuild + 1}`;

    const newBuild = await ClientBuild.create({
      version,
      message,
      platform,
      releaseType,
      buildFormat: platform === "android" ? (buildFormat || "apk") : null,
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

    // Cancel any scheduled shutdown
    autoShutdown.cancelShutdown();

    // Set Redis status to startingInstance
    await redisClient.hSet(CLIENT_BUILD_STATUS_KEY, {
      status: "startingInstance",
      version: version,
      buildId: newBuild._id.toString(),
      startTime: Date.now().toString(),
      platform: platform,
    });

    LogModule.log({
      key1: "createClientBuild",
      key2: "starting_instance",
      text1: "Starting EC2 instance",
      text2: `Version: ${version}, Build ID: ${newBuild._id}, Platform: ${platform}`,
    });

    // Start instance and wait for it to be ready
    try {
      await ec2Manager.startAndWaitForInstance();

      // Update Redis with instanceReady status
      await redisClient.hSet(CLIENT_BUILD_STATUS_KEY, {
        status: "instanceReady",
      });

      LogModule.log({
        key1: "createClientBuild",
        key2: "instance_ready",
        text1: "Instance is ready",
        text2: `Private IP: ${config.UNITY_SERVER_IP}`,
      });
    } catch (instanceError) {
      LogModule.error({
        key1: "createClientBuild",
        key2: "instance_start_failed",
        text1: "Failed to start or prepare instance",
        text2: instanceError.message,
        error: instanceError.message,
        stack: instanceError.stack,
      });

      // Update build as failed
      await ClientBuild.findByIdAndUpdate(newBuild._id, {
        buildFailed: true,
        failedAt: new Date(),
        errorMessage: "Failed to start EC2 instance: " + instanceError.message,
      });

      // Reset Redis to idle
      await setRedisIdle();

      return {
        success: false,
        message: "Failed to start build server instance",
      };
    }

    // Update Redis status to building
    await redisClient.hSet(CLIENT_BUILD_STATUS_KEY, {
      status: "building",
    });

    // Select build script and args based on platform
    const buildScript = platform === "android" ? "buildAndroid.sh" : "buildWindows.sh";
    const buildArgs = platform === "android"
      ? `${version} ${releaseType} ${buildFormat || "apk"}`
      : `${version} ${releaseType}`;

    LogModule.log({
      key1: "createClientBuild",
      key2: "building",
      text1: "Starting build process",
      text2: `Version: ${version}, Private IP: ${config.UNITY_SERVER_IP}, Platform: ${platform}, Script: ${buildScript}`,
    });

    // Making build in AWS server using the private IP from config
    exec(
      `ssh ubuntu@${config.UNITY_SERVER_IP} "nohup /home/ubuntu/scripts/${buildScript} ${buildArgs} > /home/ubuntu/build.log 2>&1 &"`,
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

          // Reset Redis to idle AND update database
          await Promise.all([
            setRedisIdle(),
            ClientBuild.findByIdAndUpdate(newBuild._id, {
              buildFailed: true,
              failedAt: new Date(),
              errorMessage: "SSH connection failed: " + err.message,
            }),
          ]);

          return console.error(err);
        }
        console.log(stdout);
      }
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

    // Make sure Redis is cleaned up on error
    await setRedisIdle();

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

    // Deleting entire version folder from S3 (includes artifact + logs)
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
      }
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

    // Look up the target build to get its platform
    const targetBuild = await ClientBuild.findById(buildId);

    if (!targetBuild) {
      LogModule.error({
        key1: "setActiveClientBuild",
        key2: "not_found",
        text1: "Build not found for activation",
        text2: `Build ID: ${buildId}`,
      });
      return { success: false, message: "No build found with that ID" };
    }

    // Only deactivate builds of the same platform (allows one active per platform)
    await ClientBuild.updateMany(
      { isDeleted: false, platform: targetBuild.platform },
      { $set: { isActive: false } }
    );

    // Then, set the selected build to active
    const result = await ClientBuild.findByIdAndUpdate(
      buildId,
      { $set: { isActive: true } }
    );

    if (!result) {
      return { success: false, message: "Failed to activate build" };
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

    // Get current version from Redis
    const currentBuildStatus = await getBuildStatusFromRedis();

    // Only validate version match if we have a currentVersion in Redis
    if (currentBuildStatus.version && currentBuildStatus.version !== version) {
      LogModule.error({
        key1: "clientBuildStatus",
        key2: "version_mismatch",
        text1: "Version mismatch",
        text2: `Expected: ${currentBuildStatus.version}, Received: ${version}`,
      });
      return { success: false, message: "Version mismatch" };
    }

    // Get buildId from Redis (might be null if Redis was cleared)
    let actualBuildId = currentBuildStatus.buildId;

    // If no buildId in Redis, try to find build by version in database
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

      // Set Redis to idle and clean up
      await setRedisIdle();
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

      // Set Redis to idle and clean up
      await setRedisIdle();
    } else if (status === "building") {
      // Update Redis status to building (in case it was lost)
      await redisClient.hSet(CLIENT_BUILD_STATUS_KEY, {
        status: "building",
      });
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

// Get current build status from Redis with timeout check
const getCurrentBuildStatus = async () => {
  try {
    // Check for timeout first
    await checkBuildTimeout();

    const buildStatus = await getBuildStatusFromRedis();

    let elapsedTime = null;
    if (buildStatus.startTime && buildStatus.status === "building") {
      elapsedTime = Date.now() - buildStatus.startTime;
    }

    return {
      success: true,
      data: {
        status: buildStatus.status || "idle",
        version: buildStatus.version || null,
        buildId: buildStatus.buildId || null,
        elapsedTime: elapsedTime,
        endTime: buildStatus.endTime || null,
        platform: buildStatus.platform || null,
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

// Force reset build status - useful for recovering from crashed builds
const forceResetBuildStatus = async (data) => {
  try {
    const { userData } = data;
    const userId = userData?.userId;

    LogModule.log({
      key1: "forceResetClientBuildStatus",
      key2: "start",
      text1: "Force resetting client build status",
      text2: `Initiated by user: ${userId}`,
    });

    // Get current build info before resetting
    const currentBuildStatus = await getBuildStatusFromRedis();

    // Mark the current build as failed if it exists
    if (currentBuildStatus.buildId) {
      await ClientBuild.findByIdAndUpdate(currentBuildStatus.buildId, {
        buildFailed: true,
        failedAt: new Date(),
        errorMessage: "Build manually reset due to crash or timeout",
      });
    }

    // Reset Redis to idle
    await setRedisIdle();

    LogModule.log({
      key1: "forceResetClientBuildStatus",
      key2: "success",
      text1: "Client build status force reset successfully",
      text2: `Previous version: ${currentBuildStatus.version || "none"}, Previous build ID: ${currentBuildStatus.buildId || "none"}`,
    });

    return {
      success: true,
      message: "Client build status has been reset to idle",
      data: {
        previousVersion: currentBuildStatus.version,
        previousBuildId: currentBuildStatus.buildId,
      },
    };
  } catch (error) {
    LogModule.error({
      key1: "forceResetClientBuildStatus",
      key2: "error",
      text1: "Failed to force reset client build status",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: "Failed to reset client build status",
    };
  }
};

// Get download URL for a build using CloudFront
const getDownloadUrl = async (data) => {
  try {
    const { buildId } = data;

    if (!buildId) {
      return { success: false, message: "Build ID is required" };
    }

    const build = await ClientBuild.findById(buildId);

    if (!build) {
      return { success: false, message: "Build not found" };
    }

    if (!build.buildCompleted) {
      return { success: false, message: "Build is not completed yet" };
    }

    if (!CLOUDFRONT_URL) {
      return { success: false, message: "CloudFront URL is not configured" };
    }

    let filename;
    if (build.platform === "android") {
      const ext = build.buildFormat || "apk";
      filename = `Client-Android-${build.version}.${ext}`;
    } else {
      filename = `Client-Windows-${build.version}.zip`;
    }

    const downloadUrl = `${CLOUDFRONT_URL}/${build.version}/${filename}`;

    return {
      success: true,
      data: { downloadUrl, filename, version: build.version, platform: build.platform },
    };
  } catch (error) {
    LogModule.error({
      key1: "getDownloadUrl",
      key2: "error",
      text1: "Failed to get download URL",
      text2: error.message,
    });
    return { success: false, message: "Failed to get download URL" };
  }
};

// Get download URL for the active build of a given platform (public, no auth)
const getActiveDownloadUrl = async (data) => {
  try {
    const { platform } = data;

    if (!platform || !["windows", "android"].includes(platform)) {
      return { success: false, message: "Valid platform is required (windows or android)" };
    }

    const build = await ClientBuild.findOne({
      platform,
      isActive: true,
      isDeleted: false,
      buildCompleted: true,
    });

    if (!build) {
      return { success: false, message: "No active build available for this platform" };
    }

    if (!CLOUDFRONT_URL) {
      return { success: false, message: "Download service is not configured" };
    }

    let filename;
    if (build.platform === "android") {
      const ext = build.buildFormat || "apk";
      filename = `Client-Android-${build.version}.${ext}`;
    } else {
      filename = `Client-Windows-${build.version}.zip`;
    }

    const downloadUrl = `${CLOUDFRONT_URL}/${build.version}/${filename}`;

    return {
      success: true,
      data: { downloadUrl, filename, version: build.version, platform: build.platform },
    };
  } catch (error) {
    LogModule.error({
      key1: "getActiveDownloadUrl",
      key2: "error",
      text1: "Failed to get active download URL",
      text2: error.message,
    });
    return { success: false, message: "Failed to get download URL" };
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
  forceResetBuildStatus,
  checkBuildTimeout,
  getDownloadUrl,
  getActiveDownloadUrl,
};