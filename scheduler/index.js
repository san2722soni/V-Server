import cron from "node-cron";
import redisClient from '../db/redis.js';
import Game from "../model/Game.js";

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

// Init Scheduler ( register all cron jobs )
const initScheduler = () => {

    cron.schedule("* * * * *", cleanupInactivePlayers); // run every 1 min

};

export default initScheduler;