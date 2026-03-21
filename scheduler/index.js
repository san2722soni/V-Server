import mongodb from '../db/mongo.js';
import redisClient from '../db/redis.js';
import registerMatchmakingCron from './matchmaking.js';
import registerLobbyCron from './lobby.js';
import registerGameServerCron from './gameServer.js';

const run = async () => {
    await mongodb.connect();
    await redisClient.connect();

    // registerMatchmakingCron();
    registerLobbyCron();
    registerGameServerCron();

    console.log("[SCHEDULER] Running");
};

run();
