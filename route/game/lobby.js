import Lobby from "../../service/game/lobby.js";
import { requireServer, requireUser, wrapper } from "../middleware.js";

export default async function lobbyRoutes(fastify) {
  // Remove the global hook and add requireUser to each route individually

  fastify.post(
    "/joinLobby",
    { preHandler: requireUser },
    wrapper(Lobby.joinLobby)
  );
  fastify.post(
    "/startMatch",
    { preHandler: requireUser },
    wrapper(Lobby.startMatch)
  );
  fastify.post(
    "/leaveLobby",
    { preHandler: requireUser },
    wrapper(Lobby.leaveLobby)
  );
  fastify.post(
    "/createLobby",
    { preHandler: requireUser },
    wrapper(Lobby.createLobby)
  );
  fastify.post(
    "/getLobbyStatus",
    { preHandler: requireUser },
    wrapper(Lobby.getLobbyStatus)
  );
  fastify.post(
    "/getActiveGame",
    { preHandler: requireUser },
    wrapper(Lobby.getActiveGame)
  );
  fastify.post(
    "/selectPosition",
    { preHandler: requireUser },
    wrapper(Lobby.selectPosition)
  );

  // mockLobbyData - server-to-server
  fastify.post("/mockLobbyData", { preHandler: requireServer }, wrapper(Lobby.mockLobbyData));

  // /getServerLobbyStatus - server-to-server
  fastify.post(
    "/getServerLobbyStatus",
    { preHandler: requireServer },
    wrapper(Lobby.getServerLobbyStatus)
  );

  // serverStarted - server-to-server
  fastify.post("/serverStarted", { preHandler: requireServer }, wrapper(Lobby.serverStarted));
}
