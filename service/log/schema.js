import { LOG_TYPES } from "../../constants/index.js";

export const LogSchema = {
  data: { type: "text" },
  date: { type: "date" },
  key1: { type: "keyword" },
  key2: { type: "keyword" },
  text1: { type: "text" },
  text2: { type: "text" },
  metric: { type: "integer" },
  txnId: { type: "keyword" },
  type: {
    type: "constant_keyword",
    value: LOG_TYPES.LOG,
  },
};

export const ErrorSchema = {
  error: { type: "text" },
  message: { type: "text" },
  stack: { type: "text" },
  date: { type: "date" },
  key1: { type: "keyword" },
  key2: { type: "keyword" },
  text1: { type: "text" },
  text2: { type: "text" },
  txnId: { type: "keyword" },
  type: {
    type: "constant_keyword",
    value: LOG_TYPES.ERROR,
  },
};
