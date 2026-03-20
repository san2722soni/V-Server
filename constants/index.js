export const HEADERS = {
    AUTHORIZATION: "authorization"
};

export const ApiRequestLogBlackList = [
    ''
];

export const ApiResponseLogBlackList = [
    ''
];

export const MATCH_MAKING_LIMIT = 2;

export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

export const REFRESH_TOKEN_SECRET = 1000 * 60 * 60 * 24 * 180;

export const GENDER = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other'
};

export const FeatureFlagTypes = {
    STRING: 'string',
    BOOLEAN: 'boolean',
    INTEGER: 'integer'
}

export const ROLES = {
    FRONTEND: 'Frontend',
    BACKEND: 'Backend',
    FULL_STACK: 'Full-Stack'
};

export const PERMISSIONS = {
    CREATE: 'Create',
    READ: 'Read',
    UPDATE: 'Update',
    DELETE: 'Delete',
    ALL: "All"
};

export const REFRESH_TOKEN_EXPIRE_TIME = 1000 * 60 * 60 * 24 * 180;

export const ACCESS_TOKEN_EXPIRE_TIME_IN_SECS = 60 * 15; // 15 minutes

export const FCM_EVENTS = {
    HELP_CHAT: 'helpchat',
};

export const LOG_TYPES = {
    LOG: 'log',
    ERROR: 'error',
    EVENT: 'event',
    FE_LOG: 'felog',
};
// 'production' → elasticsearch, otherwise → console
export const LOG_MODE = process.env.NODE_ENV === 'production' ? 'elastic' : 'console';
export const enableLogging = true;
