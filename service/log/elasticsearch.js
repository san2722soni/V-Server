import { LOG_TYPES, LOG_MODE, enableLogging } from '../../constants/index.js';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const isProduction = LOG_MODE === 'elastic';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs');

// Production: Pino writes to NDJSON files → Filebeat ships to Elasticsearch
// Development: Pino writes to stdout (console)
const logLogger = pino(isProduction ? path.join(logsDir, 'v-log.log') : undefined);
const errorLogger = pino(isProduction ? path.join(logsDir, 'v-error.log') : undefined);
const unityLogger = pino(isProduction ? path.join(logsDir, 'v-unity.log') : undefined);

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
