import redis from "../../db/redis.js";
import LogModule from "../log/index.js";
import { stopInstance } from "./ec2manager.js";

const redisClient = redis.client;
const SERVER_BUILD_STATUS_KEY = "server_build_status";
const AUTO_SHUTDOWN_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds

let shutdownTimer = null;

/**
 * Schedule instance shutdown after 5 minutes of idle time
 */
export const scheduleShutdown = async () => {
  try {
    // Clear any existing timer
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
      LogModule.log({
        key1: "autoShutdown",
        key2: "scheduleShutdown_cleared",
        text1: "Cleared existing shutdown timer",
        text2: "New timer will be set",
      });
    }

    // Get end time from Redis
    const endTime = await redisClient.hGet(SERVER_BUILD_STATUS_KEY, "endTime");

    if (!endTime) {
      LogModule.error({
        key1: "autoShutdown",
        key2: "scheduleShutdown_no_endtime",
        text1: "No endTime found in Redis",
        text2: "Cannot schedule shutdown",
      });
      return;
    }

    const endTimeMs = parseInt(endTime);
    const currentTime = Date.now();
    const timeElapsed = currentTime - endTimeMs;
    const remainingTime = AUTO_SHUTDOWN_DELAY - timeElapsed;

    LogModule.log({
      key1: "autoShutdown",
      key2: "scheduleShutdown",
      text1: "Scheduling instance shutdown",
      text2: `Time remaining: ${Math.round(remainingTime / 1000)}s (${Math.round(remainingTime / 60000)} minutes)`,
    });

    // If already past 5 minutes, shut down immediately
    if (remainingTime <= 0) {
      LogModule.log({
        key1: "autoShutdown",
        key2: "scheduleShutdown_immediate",
        text1: "Shutdown delay already passed",
        text2: "Shutting down immediately",
      });
      await executeShutdown();
      return;
    }

    // Schedule shutdown
    shutdownTimer = setTimeout(async () => {
      await executeShutdown();
    }, remainingTime);

    LogModule.log({
      key1: "autoShutdown",
      key2: "scheduleShutdown_scheduled",
      text1: "Shutdown timer set",
      text2: `Will shutdown in ${Math.round(remainingTime / 60000)} minutes`,
    });
  } catch (error) {
    LogModule.error({
      key1: "autoShutdown",
      key2: "scheduleShutdown_error",
      text1: "Failed to schedule shutdown",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Execute instance shutdown
 */
const executeShutdown = async () => {
  try {
    LogModule.log({
      key1: "autoShutdown",
      key2: "executeShutdown",
      text1: "Executing instance shutdown",
      text2: "5-minute idle period has elapsed",
    });

    // Check if status is still idle before shutting down
    const status = await redisClient.hGet(SERVER_BUILD_STATUS_KEY, "status");

    if (status !== "idle") {
      LogModule.log({
        key1: "autoShutdown",
        key2: "executeShutdown_cancelled",
        text1: "Shutdown cancelled",
        text2: `Status changed to: ${status}`,
      });
      return;
    }

    // Stop the instance
    const result = await stopInstance();

    LogModule.log({
      key1: "autoShutdown",
      key2: "executeShutdown_success",
      text1: "Instance shutdown initiated",
      text2: `State: ${result.state}`,
    });

    // Clear the timer reference
    shutdownTimer = null;
  } catch (error) {
    LogModule.error({
      key1: "autoShutdown",
      key2: "executeShutdown_error",
      text1: "Failed to execute shutdown",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
  }
};

/**
 * Cancel scheduled shutdown (called when a new build starts)
 */
export const cancelShutdown = () => {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;

    LogModule.log({
      key1: "autoShutdown",
      key2: "cancelShutdown",
      text1: "Shutdown timer cancelled",
      text2: "New build starting",
    });
  }
};

/**
 * Check if shutdown is scheduled
 * @returns {boolean}
 */
export const isShutdownScheduled = () => {
  return shutdownTimer !== null;
};

export default {
  scheduleShutdown,
  cancelShutdown,
  isShutdownScheduled,
};