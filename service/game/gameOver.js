import CustomGame from "../../model/CustomGame.js";
import Lobby from "../../model/Lobby.js";
import redisClient from "../../db/redis.js";
import LogModule from "../../service/log/index.js";
import config from "../../constants/config.js";
import { EC2Client, TerminateInstancesCommand } from "@aws-sdk/client-ec2";

const client = redisClient.client;
const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = config;

const ec2Client = new EC2Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

/* -------------------------------------------------------------------------- */
/*                            STOP EC2 SERVER HELPER                          */
/* -------------------------------------------------------------------------- */
async function stopServer(instanceIds) {
  try {
    LogModule.log({
      key1: "stopServer",
      key2: "start",
      text1: "Stopping EC2 servers",
      text2: `Instance IDs: ${instanceIds.join(", ")}`,
    });

    // 🧩 Skip in non-production environments
    if (process.env.NODE_ENV !== "production") {
      LogModule.log({
        key1: "stopServer",
        key2: "dev_mock",
        text1: "Dev mock - server stop skipped",
        text2: `Instance IDs: ${instanceIds.join(", ")}`,
      });
      return { success: true, message: "Dev mock - server stop skipped" };
    }

    // 🧩 Terminate all EC2 instances at once
    const command = new TerminateInstancesCommand({
      InstanceIds: instanceIds,
    });

    const response = await ec2Client.send(command);

    LogModule.log({
      key1: "stopServer",
      key2: "success",
      text1: "EC2 server termination initiated",
      text2: `Instance IDs: ${instanceIds.join(", ")}`,
    });

    return response;
  } catch (err) {
    LogModule.error({
      key1: "stopServer",
      key2: "failed",
      text1: "EC2 server termination failed",
      text2: `Instance IDs: ${instanceIds.join(", ")}`,
      error: err.message,
      stack: error.stack,
    });
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*                             GAME OVER MAIN FLOW                            */
/* -------------------------------------------------------------------------- */
const gameOver = async (data) => {
  const { gameId } = data;

  try {
    LogModule.log({
      key1: "gameOver",
      key2: "start",
      text1: "Game over process started",
      text2: `Game ID: ${gameId}`,
    });

    if (!gameId) {
      return { success: false, message: "Game ID is required" };
    }

    const currentGame = await CustomGame.findById(gameId);
    if (!currentGame) {
      return { success: false, message: "Game not found" };
    }

    // 1️⃣ Remove from Redis cache
    await client.del(`currentGame:${gameId}`);

    // 2️⃣ Mark CustomGame as completed
    await CustomGame.findByIdAndUpdate(gameId, { completed: true });

    // 3️⃣ Remove lastActive keys for all players
    if (currentGame.players?.length) {
      await Promise.all(
        currentGame.players.map((p) => client.del(`lastActive:${p.userId}`))
      );

      LogModule.log({
        key1: "gameOver",
        key2: "lastActiveCleanup",
        text1: "Removed lastActive keys for players",
        text2: `Removed ${currentGame.players.length} player keys`,
      });
    }

    // 4️⃣ Update Lobby status
    if (currentGame.createdByLobby) {
      await Lobby.findOneAndUpdate(
        { lobbyId: currentGame.createdByLobby },
        { inGame: false, gameCompleted: true }
      );
    }

    // 5️⃣ Stop EC2 server (production only)
    if (
      process.env.NODE_ENV === "production" &&
      currentGame.ec2InstanceIds &&
      currentGame.ec2InstanceIds.length > 0
    ) {
      await stopServer(currentGame.ec2InstanceIds);

      await CustomGame.findByIdAndUpdate(gameId, { ec2InstanceIds: [] });

      LogModule.log({
        key1: "gameOver",
        key2: "serverStopped",
        text1: "Associated EC2 instances stopped",
        text2: `Game ID: ${gameId}, Instances: ${currentGame.ec2InstanceIds.join(
          ", "
        )}`,
      });
    }

    // ✅ Final success log
    LogModule.log({
      key1: "gameOver",
      key2: "success",
      text1: "Game over processed successfully",
      text2: `Game ID: ${gameId}`,
    });

    const finishedGame = await CustomGame.findById(gameId);

    return {
      success: true,
      message: "Game over processed successfully",
      status: finishedGame,
    };
  } catch (error) {
    LogModule.error({
      key1: "gameOver",
      key2: "failed",
      text1: "Game over process failed",
      text2: `Game ID: ${gameId}`,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }
};

export default { gameOver };
