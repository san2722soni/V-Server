import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";
import { exec } from "child_process";
import { promisify } from "util";
import config from "../../constants/config.js";
import LogModule from "../log/index.js";

const execPromise = promisify(exec);

const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, UNITY_BUILD_SERVER_INSTANCE_ID, UNITY_SERVER_IP } = config;

// Initialize EC2 Client
const ec2Client = new EC2Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Start the Unity Build Server EC2 instance
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const startInstance = async () => {
  try {
    LogModule.log({
      key1: "ec2Manager",
      key2: "startInstance",
      text1: "Starting EC2 instance",
      text2: `Instance ID: ${UNITY_BUILD_SERVER_INSTANCE_ID}`,
    });

    const command = new StartInstancesCommand({
      InstanceIds: [UNITY_BUILD_SERVER_INSTANCE_ID],
    });

    const response = await ec2Client.send(command);

    LogModule.log({
      key1: "ec2Manager",
      key2: "startInstance_success",
      text1: "EC2 instance start command sent",
      text2: `Current State: ${response.StartingInstances[0]?.CurrentState?.Name}`,
    });

    return {
      success: true,
      message: "Instance start initiated",
      state: response.StartingInstances[0]?.CurrentState?.Name,
    };
  } catch (error) {
    LogModule.error({
      key1: "ec2Manager",
      key2: "startInstance_error",
      text1: "Failed to start EC2 instance",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Stop the Unity Build Server EC2 instance
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const stopInstance = async () => {
  try {
    LogModule.log({
      key1: "ec2Manager",
      key2: "stopInstance",
      text1: "Stopping EC2 instance",
      text2: `Instance ID: ${UNITY_BUILD_SERVER_INSTANCE_ID}`,
    });

    const command = new StopInstancesCommand({
      InstanceIds: [UNITY_BUILD_SERVER_INSTANCE_ID],
    });

    const response = await ec2Client.send(command);

    LogModule.log({
      key1: "ec2Manager",
      key2: "stopInstance_success",
      text1: "EC2 instance stop command sent",
      text2: `Current State: ${response.StoppingInstances[0]?.CurrentState?.Name}`,
    });

    return {
      success: true,
      message: "Instance stop initiated",
      state: response.StoppingInstances[0]?.CurrentState?.Name,
    };
  } catch (error) {
    LogModule.error({
      key1: "ec2Manager",
      key2: "stopInstance_error",
      text1: "Failed to stop EC2 instance",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get instance state
 * @returns {Promise<Object>} { success: boolean, state: string }
 */
export const getInstanceDetails = async () => {
  try {
    const command = new DescribeInstancesCommand({
      InstanceIds: [UNITY_BUILD_SERVER_INSTANCE_ID],
    });

    const response = await ec2Client.send(command);
    const instance = response.Reservations[0]?.Instances[0];

    if (!instance) {
      throw new Error("Instance not found");
    }

    return {
      success: true,
      state: instance.State.Name,
    };
  } catch (error) {
    LogModule.error({
      key1: "ec2Manager",
      key2: "getInstanceDetails_error",
      text1: "Failed to get instance details",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Wait for instance to be in "running" state
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 5 minutes)
 * @param {number} pollInterval - Polling interval in milliseconds (default: 5 seconds)
 * @returns {Promise<Object>} { success: boolean, state: string }
 */
export const waitForInstanceRunning = async (
  maxWaitTime = 5 * 60 * 1000,
  pollInterval = 5000
) => {
  const startTime = Date.now();

  LogModule.log({
    key1: "ec2Manager",
    key2: "waitForInstanceRunning",
    text1: "Waiting for instance to be running",
    text2: `Max wait time: ${maxWaitTime / 1000}s`,
  });

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const details = await getInstanceDetails();

      LogModule.log({
        key1: "ec2Manager",
        key2: "waitForInstanceRunning_poll",
        text1: "Instance state check",
        text2: `State: ${details.state}`,
      });

      if (details.state === "running") {
        LogModule.log({
          key1: "ec2Manager",
          key2: "waitForInstanceRunning_success",
          text1: "Instance is now running",
          text2: `Using private IP: ${UNITY_SERVER_IP}`,
        });

        return {
          success: true,
          state: details.state,
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      LogModule.error({
        key1: "ec2Manager",
        key2: "waitForInstanceRunning_poll_error",
        text1: "Error while polling instance state",
        text2: error.message,
      });
      // Continue polling despite error
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  // Timeout reached
  throw new Error(
    `Instance did not reach running state within ${maxWaitTime / 1000} seconds`
  );
};

/**
 * Check if SSH health check returns OK
 * @returns {Promise<boolean>} true if health check passes
 */
export const checkSSHHealth = async () => {
  try {
    const command = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@${UNITY_SERVER_IP} "bash /home/ubuntu/scripts/healthCheck.sh"`;

    const { stdout, stderr } = await execPromise(command);

    const output = stdout.trim();

    LogModule.log({
      key1: "ec2Manager",
      key2: "checkSSHHealth",
      text1: "SSH health check response",
      text2: `Output: ${output}, IP: ${UNITY_SERVER_IP}`,
    });

    return output === "OK";
  } catch (error) {
    LogModule.error({
      key1: "ec2Manager",
      key2: "checkSSHHealth_error",
      text1: "SSH health check failed",
      text2: error.message,
    });
    return false;
  }
};

/**
 * Wait for SSH health check to pass
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 3 minutes)
 * @param {number} pollInterval - Polling interval in milliseconds (default: 2 seconds)
 * @returns {Promise<Object>} { success: boolean }
 */
export const waitForSSHHealthy = async (
  maxWaitTime = 3 * 60 * 1000,
  pollInterval = 2000
) => {
  const startTime = Date.now();

  LogModule.log({
    key1: "ec2Manager",
    key2: "waitForSSHHealthy",
    text1: "Waiting for SSH health check to pass",
    text2: `Private IP: ${UNITY_SERVER_IP}, Max wait time: ${maxWaitTime / 1000}s`,
  });

  while (Date.now() - startTime < maxWaitTime) {
    const isHealthy = await checkSSHHealth();

    if (isHealthy) {
      LogModule.log({
        key1: "ec2Manager",
        key2: "waitForSSHHealthy_success",
        text1: "SSH health check passed",
        text2: `Private IP: ${UNITY_SERVER_IP}`,
      });

      return {
        success: true,
      };
    }

    LogModule.log({
      key1: "ec2Manager",
      key2: "waitForSSHHealthy_retry",
      text1: "SSH health check not ready, retrying...",
      text2: `Elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`,
    });

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout reached
  throw new Error(
    `SSH health check did not pass within ${maxWaitTime / 1000} seconds`
  );
};

/**
 * Complete instance startup flow: start instance, wait for running, wait for SSH
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const startAndWaitForInstance = async () => {
  try {
    LogModule.log({
      key1: "ec2Manager",
      key2: "startAndWaitForInstance",
      text1: "Starting complete instance startup flow",
      text2: "Step 1: Starting instance",
    });

    // Step 1: Start the instance
    await startInstance();

    // Step 2: Wait for instance to be running
    LogModule.log({
      key1: "ec2Manager",
      key2: "startAndWaitForInstance",
      text1: "Instance start initiated",
      text2: "Step 2: Waiting for running state",
    });

    await waitForInstanceRunning();

    // Step 3: Wait for SSH to be healthy
    LogModule.log({
      key1: "ec2Manager",
      key2: "startAndWaitForInstance",
      text1: "Instance is running",
      text2: `Step 3: Waiting for SSH health check, Private IP: ${UNITY_SERVER_IP}`,
    });

    await waitForSSHHealthy();

    LogModule.log({
      key1: "ec2Manager",
      key2: "startAndWaitForInstance_complete",
      text1: "Instance startup complete",
      text2: `Private IP: ${UNITY_SERVER_IP}, Instance is ready for builds`,
    });

    return {
      success: true,
      message: "Instance is ready",
    };
  } catch (error) {
    LogModule.error({
      key1: "ec2Manager",
      key2: "startAndWaitForInstance_error",
      text1: "Failed to start and prepare instance",
      text2: error.message,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default {
  startInstance,
  stopInstance,
  getInstanceDetails,
  waitForInstanceRunning,
  checkSSHHealth,
  waitForSSHHealthy,
  startAndWaitForInstance,
};