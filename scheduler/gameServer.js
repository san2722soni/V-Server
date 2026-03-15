import cron from "node-cron";
import { EC2Client, TerminateInstancesCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import redisClient from '../db/redis.js';
import CustomGame from "../model/CustomGame.js";
import Lobby from "../model/Lobby.js";
import config from "../constants/config.js";
import LogModule from "../service/log/index.js";
import { withTxn } from '../util/asyncStorage.js';

const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = config;
const client = redisClient.client;

const ec2Client = new EC2Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});

const GAME_MAX_DURATION_MS = 20 * 60 * 1000;

const cleanupStaleGameServers = async () => {
    try {
        const cutoff = new Date(Date.now() - GAME_MAX_DURATION_MS);

        const staleGames = await CustomGame.find({
            completed: false,
            createdAt: { $lt: cutoff },
        });

        if (staleGames.length === 0) return;

        LogModule.log({
            key1: "cleanupStaleGameServers",
            key2: "found",
            text1: `Found ${staleGames.length} stale game(s)`,
        });

        for (const game of staleGames) {
            const gameId = game._id.toString();

            // Terminate EC2 instances
            if (
                process.env.NODE_ENV === "production" &&
                game.ec2InstanceIds?.length > 0
            ) {
                try {
                    const command = new TerminateInstancesCommand({
                        InstanceIds: game.ec2InstanceIds,
                    });
                    await ec2Client.send(command);

                    LogModule.log({
                        key1: "cleanupStaleGameServers",
                        key2: "ec2Terminated",
                        text1: `Terminated EC2 for game ${gameId}`,
                        text2: `Instances: ${game.ec2InstanceIds.join(", ")}`,
                    });
                } catch (ec2Error) {
                    if (ec2Error.name === "InvalidInstanceID.NotFound") {
                        LogModule.log({
                            key1: "cleanupStaleGameServers",
                            key2: "ec2AlreadyGone",
                            text1: `EC2 instances already terminated for game ${gameId}`,
                        });
                    } else {
                        throw ec2Error;
                    }
                }
            }

            // Remove from Redis
            await client.del(`currentGame:${gameId}`);

            // Remove player lastActive keys
            if (game.players?.length) {
                await Promise.all(
                    game.players.map((p) => client.del(`lastActive:${p.userId}`))
                );
            }

            // Mark game completed
            await CustomGame.findByIdAndUpdate(gameId, {
                completed: true,
                ec2InstanceIds: [],
            });

            // Update lobby
            if (game.createdByLobby) {
                await Lobby.findOneAndUpdate(
                    { lobbyId: game.createdByLobby },
                    { inGame: false, gameCompleted: true }
                );
            }

            LogModule.log({
                key1: "cleanupStaleGameServers",
                key2: "cleaned",
                text1: `Game ${gameId} cleaned up`,
            });
        }
    } catch (error) {
        LogModule.error({
            key1: "cleanupStaleGameServers",
            key2: "error",
            text1: "Stale game server cleanup failed",
            error: error.message,
            stack: error.stack,
        });
        console.error("[CRON] Error cleaning up stale game servers:", error);
    }
};

const cleanupStaleEC2GameServers = async () => {
    if (process.env.NODE_ENV !== "production") return;
    try {
        LogModule.log({
            key1: "cleanupStaleEC2GameServers",
            key2: "start",
            text1: "Starting cleanup of stale EC2 game server instances",
            text2: "Looking for unity-game-server instances running > 20 minutes",
        });

        // Describe all running instances with the tag Name=unity-game-server
        const describeCommand = new DescribeInstancesCommand({
            Filters: [
                {
                    Name: "tag:Name",
                    Values: ["unity-game-server"],
                },
                {
                    Name: "instance-state-name",
                    Values: ["running"],
                },
            ],
        });

        const describeResponse = await ec2Client.send(describeCommand);

        // Flatten all instances from all reservations
        const allInstances = describeResponse.Reservations?.flatMap(
            (reservation) => reservation.Instances || []
        ) || [];

        if (allInstances.length === 0) {
            LogModule.log({
                key1: "cleanupStaleEC2GameServers",
                key2: "none_found",
                text1: "No running unity-game-server instances found",
            });
            return;
        }

        // Filter instances running for more than 20 minutes
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
        const staleInstances = allInstances.filter((instance) => {
            const launchTime = new Date(instance.LaunchTime);
            return launchTime < twentyMinutesAgo;
        });

        if (staleInstances.length === 0) {
            LogModule.log({
                key1: "cleanupStaleEC2GameServers",
                key2: "none_stale",
                text1: "No stale instances found",
                text2: `Total running: ${allInstances.length}, all under 20 minutes`,
            });
            return;
        }

        const instanceIdsToTerminate = staleInstances.map((instance) => instance.InstanceId);

        LogModule.log({
            key1: "cleanupStaleEC2GameServers",
            key2: "found",
            text1: `Found ${staleInstances.length} stale instance(s)`,
            text2: `Instance IDs: ${instanceIdsToTerminate.join(", ")}`,
        });

        // Only terminate in production
        if (process.env.NODE_ENV === "production") {
            try {
                const terminateCommand = new TerminateInstancesCommand({
                    InstanceIds: instanceIdsToTerminate,
                });

                await ec2Client.send(terminateCommand);

                LogModule.log({
                    key1: "cleanupStaleEC2GameServers",
                    key2: "terminated",
                    text1: "Stale instances terminated successfully",
                    text2: `Terminated ${instanceIdsToTerminate.length} instance(s)`,
                });
            } catch (ec2Error) {
                if (ec2Error.name === "InvalidInstanceID.NotFound") {
                    LogModule.log({
                        key1: "cleanupStaleEC2GameServers",
                        key2: "ec2AlreadyGone",
                        text1: "Some instances were already terminated",
                    });
                } else {
                    throw ec2Error;
                }
            }
        } else {
            LogModule.log({
                key1: "cleanupStaleEC2GameServers",
                key2: "dev_mode",
                text1: "Skipping termination (not production)",
                text2: `Would have terminated: ${instanceIdsToTerminate.join(", ")}`,
            });
        }
    } catch (error) {
        LogModule.error({
            key1: "cleanupStaleEC2GameServers",
            key2: "error",
            text1: "Failed to cleanup stale EC2 game server instances",
            error: error.message,
            stack: error.stack,
        });
        console.error("[CRON] Error cleaning up stale EC2 game servers:", error);
    }
};

const registerGameServerCron = () => {
    cron.schedule("* * * * *", async () => withTxn(cleanupStaleGameServers));
    cron.schedule("*/5 * * * *", async () => withTxn(cleanupStaleEC2GameServers));
};

export default registerGameServerCron;
