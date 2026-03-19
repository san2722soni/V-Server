import { addUnityDocument } from "../log/elasticsearch.js";

const bulkInsertLogs = async ({ logs, userData }) => {
  if (!Array.isArray(logs)) throw new Error("Logs must be an array");

  for (const log of logs) {
    addUnityDocument({
      type: "log",
      key1: "unity_log",
      key2: "bulk",
      text1: log.message,
      text2: log.context,
      data: JSON.stringify({ ...log, userId: userData?.userId }),
    });
  }

  return { success: true, count: logs.length };
};

const bulkInsertErrors = async ({ errors, userData }) => {
  if (!Array.isArray(errors)) throw new Error("Errors must be an array");

  for (const err of errors) {
    addUnityDocument({
      type: "error",
      key1: "unity_error",
      key2: "bulk",
      text1: err.message,
      text2: err.stackTrace,
      error: err.message,
      stack: err.stackTrace,
    });
  }

  return { success: true, count: errors.length };
};

export default {
  bulkInsertLogs,
  bulkInsertErrors
};
