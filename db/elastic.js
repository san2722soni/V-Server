import { Client } from '@elastic/elasticsearch';
import config from '../constants/config.js';
const { ES_CA, ES_PASSWORD, ES_URL, ES_USERNAME } = config;
import { createIndexes } from "../service/log/elasticsearch.js";

const client = new Client({
    node: ES_URL,
    auth: {
        username: ES_USERNAME,
        password: ES_PASSWORD
    },
    tls: {
        ca: ES_CA,
        rejectUnauthorized: false
    }
});

const connect = async () => {
    try {
        await client.ping();
        await createIndexes();
    } catch (error) {
        console.error('Elasticsearch connection failed: ', error);
        throw error;
    }
};

export default {
    connect,
    client,
};