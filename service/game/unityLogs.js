import { addUnityDocument } from "../log/elasticsearch.js";

const bulkInsertLogs = async ({ logs, userData }) => {
  if (!Array.isArray(logs)) throw new Error("Logs must be an array");

  for (const log of logs) {
    addUnityDocument({
      type: "log",
      timestamp: log.timestamp,
      level: log.level || "INFO",
      message: log.message,
      context: log.context,
      userId: log.userId || userData?.userId,
      deviceInfo: log.deviceInfo,
    });
  }

  return { success: true, count: logs.length };
};

const bulkInsertErrors = async ({ errors, userData }) => {
  if (!Array.isArray(errors)) throw new Error("Errors must be an array");

  for (const err of errors) {
    addUnityDocument({
      type: "error",
      timestamp: err.timestamp,
      level: "ERROR",
      message: err.message,
      stackTrace: err.stackTrace,
      userId: err.userId || userData?.userId,
      deviceInfo: err.deviceInfo,
    });
  }

  return { success: true, count: errors.length };
};

export default {
  bulkInsertLogs,
  bulkInsertErrors
};
