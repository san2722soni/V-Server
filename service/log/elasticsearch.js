import { LOG_TYPES, LOG_MODE } from '../../constants/index.js';
import elasticDb from '../../db/elastic.js';

// ---------- CONSOLE logger (development) ----------
const consoleLog = (type, data) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
    if (type === LOG_TYPES.ERROR) {
        console.error(prefix, data);
    } else {
        console.log(prefix, data);
    }
};

// ---------- ELASTIC logger (production) ----------
const elasticLog = async (type, data) => {
    try {
        const index = type === LOG_TYPES.FE_LOG ? 'v-unity' : type === LOG_TYPES.ERROR ? 'v-error' : 'v-log';
        await elasticDb.client.index({
            index,
            document: {
                ...data,
                type,
                date: new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error('[ElasticLog] Failed to index document:', err.message);
    }
};

// ---------- Public API ----------
export const addDocument = (type, data) => {
    const payload = { ...data, type, date: new Date().toISOString() };

    if (LOG_MODE === 'elastic') return elasticLog(type, data);
    return consoleLog(type, payload);
};

export const addUnityDocument = (data) => {
    const payload = { ...data, source: 'unity', date: new Date().toISOString() };

    if (LOG_MODE === 'elastic') return elasticLog(LOG_TYPES.FE_LOG, payload);
    return consoleLog('unity', payload);
};
