import { LOG_TYPES, enableLogging } from '../../constants/index.js';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs');

// One pino logger per log type — each writes to its own file
const logLogger = pino(path.join(logsDir, 'v-log.log'));
const errorLogger = pino(path.join(logsDir, 'v-error.log'));
const unityLogger = pino(path.join(logsDir, 'v-unity.log'));

const loggers = {
    [LOG_TYPES.LOG]: logLogger,
    [LOG_TYPES.ERROR]: errorLogger,
    [LOG_TYPES.EVENT]: logLogger,
    [LOG_TYPES.FE_LOG]: unityLogger,
};

export const addDocument = (type, data) => {
    if (!enableLogging) return;
    const logger = loggers[type] || logLogger;
    logger.info({
        ...data,
        type,
        date: new Date().toISOString(),
    });
};

export const addUnityDocument = (data) => {
    if (!enableLogging) return;
    unityLogger.info({
        ...data,
        source: 'unity',
        date: new Date().toISOString(),
    });
};
