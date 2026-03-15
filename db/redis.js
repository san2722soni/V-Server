import { createClient } from "redis";
import config from "../constants/config.js";

const { REDIS_URL } = config;

const client = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 10000, // default is short
    reconnectStrategy: (retries) => {
      return Math.min(retries * 100, 3000);
    },
  },
});

client.on("error", (err) => {
  console.error("Redis Client Error", err);
});

export const connect = async () => {
  if (!client.isOpen) {
    try {
      await client.connect();
    } catch (err) {
      console.error("Failed to connect to Redis: ", err);
    }
  }
};

export default {
  connect,
  client,
};
