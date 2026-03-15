import cron from "node-cron";
import redisClient from '../db/redis.js';
import { withTxn } from '../util/asyncStorage.js';

const client = redisClient.client;
const LOBBY_USER_KEY = "userLobby";

const cleanupInactiveLobbies = async () => {

    try {
        const lobbyKeys = await client.keys("lobby:*");

        for (const lobbyKey of lobbyKeys) {
            const lobbyData = await client.hGetAll(lobbyKey);

            if (!lobbyData || !lobbyData.creatorId) {
                await client.del(lobbyKey);
                continue;
            }

            // Check if creator is inactive for 30+ minutes
            const creatorLastActive = await client.get(`lastActive:${lobbyData.creatorId}`);

            const members = JSON.parse(lobbyData.members || "[]");

            if (!creatorLastActive) {
                // Creator inactive for 30+ mins - DELETE entire lobby
                await client.del(lobbyKey);

                // Remove user-lobby mappings
                const deletePromises = members.map(member =>
                    client.del(`${LOBBY_USER_KEY}:${member.userId}`)
                );
                await Promise.all(deletePromises);
                continue;
            }

            // Creator is active - clean up stale individual members
            const activeMembers = [];
            for (const member of members) {
                if (member.userId === lobbyData.creatorId) {
                    activeMembers.push(member);
                    continue;
                }
                const memberLastActive = await client.get(`lastActive:${member.userId}`);
                if (memberLastActive) {
                    activeMembers.push(member);
                } else {
                    // Stale member - remove their lobby mapping
                    await client.del(`${LOBBY_USER_KEY}:${member.userId}`);
                }
            }

            // Update members if any were removed
            if (activeMembers.length < members.length) {
                if (activeMembers.length === 0) {
                    await client.del(lobbyKey);
                } else {
                    await client.hSet(lobbyKey, "members", JSON.stringify(activeMembers));
                }
            }
        }
    } catch (error) {
        console.error("[CRON] Error cleaning up lobbies: ", error);
    }
};

const registerLobbyCron = () => {
    cron.schedule("*/30 * * * *", () => withTxn(cleanupInactiveLobbies));
};

export default registerLobbyCron;
