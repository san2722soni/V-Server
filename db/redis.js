import { createClient } from "redis";
import config from "../constants/config.js";

const { REDIS_URL } = config;

const client = createClient({
  url: REDIS_URL,
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
      process.exit(1);
    }
  }
};

export default {
  connect,
  client,
};
