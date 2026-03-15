import config from "./constants/config.js";
import mongodb from "./db/mongo.js";
import fastify from "fastify";
import cors from "@fastify/cors";
import router from "./route/index.js";
import redis from "./db/redis.js";
import elastic from "./db/elastic.js";
import { parseAppConfig } from "./route/middleware.js";
import initScheduler from "./scheduler/index.js";
import initLobbyScheduler from "./scheduler/lobby.js";
import LogModule from "./service/log/index.js";
import fastifyMultipart from "@fastify/multipart";

const { BODY_LIMIT, PORT = 5000 } = config;

const run = async () => {
  const app = fastify();

  await mongodb.connect();
  await redis.connect();
  await elastic.connect();

  initScheduler();
  initLobbyScheduler();

  app.options.bodyLimit = BODY_LIMIT;
  await app.register(cors, {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://dashboard.olivs.in",
      "http://103.172.252.35",
      "https://dev.olivs.in",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  // Register multipart plugin at the ROOT level
  await app.register(fastifyMultipart, {
    addToBody: false,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  app.get("/", async (_request, reply) => {
    reply.send("OK");
  });

  await app.addHook("preHandler", parseAppConfig);

  await app.register(router, { prefix: "/api" });

  app.listen({ port: PORT, host: "0.0.0.0" });
};

// Add error handlers with LogModule integration
process
  .on("unhandledRejection", (reason, p) => {
    LogModule.error({
      key1: "process",
      key2: "unhandledRejection",
      text1: "Unhandled Rejection at Promise",
      text2: `Reason: ${reason}`,
      error: JSON.stringify(p),
    });
    console.error(reason, "Unhandled Rejection at Promise", p);
    process.exit(1);
  })
  .on("uncaughtException", (err) => {
    LogModule.error({
      key1: "process",
      key2: "uncaughtException",
      text1: "Uncaught Exception",
      text2: `Error: ${err.message}`,
      error: err.stack,
    });
    console.error(
      new Date().toUTCString() + " uncaughtException:",
      err.message
    );
    console.error(err.stack);
    process.exit(1);
  });

run();
