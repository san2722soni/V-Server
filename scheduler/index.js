import mongodb from '../db/mongo.js';
import redisClient from '../db/redis.js';
import elastic from '../db/elastic.js';
import { createIndexes } from '../service/log/elasticsearch.js';
import registerMatchmakingCron from './matchmaking.js';
import registerLobbyCron from './lobby.js';
import registerGameServerCron from './gameServer.js';
import registerElasticsearchCron from './elasticsearch.js';

const run = async () => {
    await mongodb.connect();
    await redisClient.connect();
    await elastic.connect();
    await createIndexes();

    // registerMatchmakingCron();
    registerLobbyCron();
    registerGameServerCron();
    registerElasticsearchCron();

    console.log("[SCHEDULER] Running");
};

run();
