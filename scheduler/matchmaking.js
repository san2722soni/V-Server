import cron from "node-cron";
import redisClient from '../db/redis.js';
import { withTxn } from '../util/asyncStorage.js';

const client = redisClient.client;
const QUEUE_KEY = "matchmaking_queue";

const cleanupInactivePlayers = async () => {
    const players = await client.lRange(QUEUE_KEY, 0, -1);

    for (const playerId of players){
        const lastActive = await client.get(`lastActive:${playerId}`);

        if(!lastActive) {
            await client.lRem(QUEUE_KEY, 0, playerId);
        }
    }
};

const registerMatchmakingCron = (schedule = "* * * * *") => {
    cron.schedule(schedule, () => withTxn(cleanupInactivePlayers));
};

export default registerMatchmakingCron;
