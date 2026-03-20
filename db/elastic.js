
import { Client } from '@elastic/elasticsearch';
import config from '../constants/config.js';
import { LOG_MODE } from '../constants/index.js'

const { ES_CA, ES_PASSWORD, ES_URL, ES_USERNAME } = config;

const client = LOG_MODE === 'elastic' ? new Client({
    node: ES_URL,
    auth: {
        username: ES_USERNAME,
        password: ES_PASSWORD
    },
    // tls: {
    //     ca: ES_CA,
    //     rejectUnauthorized: false
    // }
}): {};

const connect = async () => {
    if (LOG_MODE !== 'elastic') return;
    try {
        await client.ping();
    } catch (error) {
        console.error('Elasticsearch connection failed: ', error);
        throw error;
    }
};

export default {
    connect,
    client,
};
