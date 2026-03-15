import { LOG_TYPES } from "../../constants/index.js";
import { addDocument } from "./elasticsearch.js";
import asyncLocalStorage from "../../util/asyncStorage.js";

const log = ({ data, key1, key2, text1, text2, metric }) => {
  const txnId = asyncLocalStorage.getStore();

//   const strin
  return addDocument(LOG_TYPES.LOG, {
    data,
    key1,
    key2,
    text1,
    text2,
    metric,
    txnId,
  });
};

const error = ({ error, message, stack, key1, key2, text1, text2 }) => {
  const txnId = asyncLocalStorage.getStore();

  return addDocument(LOG_TYPES.ERROR, {
    error,
    message,
    stack,
    key1,
    key2,
    text1,
    text2,
    txnId,
  });
};

export default {
  log,
  error,
};
