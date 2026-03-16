import auth from "./auth/index.js";
import game from "./game/index.js";
import entity from "./entity/index.js";
import dashboard from "./dashboard/index.js";
import docsRoutes from "./docs/structure.js";

export default async function router(fastify, opts) {
  fastify.get("/", async (_request, reply) => {
    reply.send("OK");
  });

  fastify.register(auth, { prefix: "/auth" });
  fastify.register(game, { prefix: "/game" });
  fastify.register(entity, { prefix: "/entity" });
  fastify.register(dashboard, { prefix: "/dashboard" });

  fastify.register(docsRoutes, { prefix: "/docs" });
}

console.log("temp");