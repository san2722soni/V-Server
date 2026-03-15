import cron from "node-cron";
import redisClient from '../db/redis.js';

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
            
            if (!creatorLastActive) {
                // Creator inactive for 30+ mins - DELETE
                const members = JSON.parse(lobbyData.members || "[]");
                
                // Remove from Redis
                await client.del(lobbyKey);
                
                // Remove user-lobby mappings
                const deletePromises = members.map(member => 
                    client.del(`${LOBBY_USER_KEY}:${member.userId}`)
                );
                await Promise.all(deletePromises);
            }
        }
    } catch (error) {
        console.error("[CRON] Error cleaning up lobbies: ", error);
    }
};

// Init Scheduler - runs every 30 minutes
const initLobbyScheduler = () => {
    cron.schedule("*/30 * * * *", cleanupInactiveLobbies); // Every 30 minutes
};

export default initLobbyScheduler;