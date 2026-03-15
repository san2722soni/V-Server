import fastify from "fastify";

import user from "./user.js";

fastify.use("/user", user);