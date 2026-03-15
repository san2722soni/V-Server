import { LOG_TYPES, enableESLogging } from '../../constants/index.js';
import { ErrorSchema, LogSchema } from './schema.js';
import ES from '../../db/elastic.js';
const ElasticSearch = ES.client;

const LogsLifecycle = 7;
const ErrorsLifecycle = 30;

let ErrorCount = 0;
let ErrorCountLogDate = Date.now();

const getDateStamp = date => date.toLocaleString('sv').split(' ')[0];

const getIndexName = (type, dateStamp) => {
    const DateStamp = dateStamp ?? getDateStamp(new Date());
    return 'v-' + type + '-' + DateStamp;
}

const catchErr = async (fn) => {
    try {
        await fn();
    } catch (_e) {
        if (++ErrorCount >= 16) {
            ErrorCountLogDate = Date.now();
            ErrorCount = 0;
        }
    }
}

const createLogIndex = async (dateStamp) => {
    return ElasticSearch.indices.create({
        index: getIndexName(LOG_TYPES.LOG, dateStamp),
        mappings: {
            dynamic: 'strict',
            properties: LogSchema,
        },
        settings: {
            refresh_interval: '3s',
        }
    });
}

const createErrorIndex = async (dateStamp) => {
    return ElasticSearch.indices.create({
        index: getIndexName(LOG_TYPES.ERROR, dateStamp),
        mappings: {
            dynamic: 'strict',
            properties: ErrorSchema,
        },
        settings: {
            refresh_interval: '3s',
        }
    });
}

const dropErrorIndex = async (dateStamp) => {
    return ElasticSearch.indices.delete({
        index: getIndexName(LOG_TYPES.ERROR, dateStamp),
    });
}

export const addDocument = async (type, data) => {
    if (!enableESLogging) return;
    await catchErr(async () => {
        await ElasticSearch.index({
            index: getIndexName(type),
            document: {
                ...data,
                date: (new Date()).toISOString(),
                type,
            },
            refresh: 'false',
        });
    });
}

export const createIndexes = async (forNextDay) => {
    if (!enableESLogging) return;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const dateStamp = forNextDay? getDateStamp(date) : undefined;

    await catchErr(async() => {
        await createLogIndex(dateStamp);
    });

    await catchErr(async() => {
        await createErrorIndex(dateStamp);
    });
}

export const dropIndexes = async ({
    logStamp,
    errorStamp,
}) => {
    if (!enableESLogging) return;

    let date = undefined;

    date = new Date();
    date.setDate(date.getDate() - LogsLifecycle);
    const logsTimeStamp = logStamp ?? getDateStamp(date);

    date = new Date();
    date.setDate(date.getDate() - ErrorsLifecycle);
    const errorsTimeStamp = errorStamp ?? getDateStamp(date);

    await catchErr(async () => {
        await dropLogIndex(logsTimeStamp);
    });
    await catchErr(async () => {
        await dropErrorIndex(errorsTimeStamp);
    });
}