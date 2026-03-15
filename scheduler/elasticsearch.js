import cron from "node-cron";
import { createIndexes } from "../service/log/elasticsearch.js";

const registerElasticsearchCron = () => {
    // Create next day's ES indexes at 11:52 PM daily
    cron.schedule("52 23 * * *", () => createIndexes(true));
};

export default registerElasticsearchCron;
