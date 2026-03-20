import { requireDeveloper, wrapper } from "../middleware.js";
import GameSessions from "../../service/dashboard/gameSessions.js";

export default async function gameSessions(fastify) {
  // GET - Get all game sessions (lobbies + games)
  fastify.get(
    "/getAll",
    { preHandler: [requireDeveloper] },
    wrapper(GameSessions.getGameSessions)
  );
}
