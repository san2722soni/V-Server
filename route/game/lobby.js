import Lobby from "../../service/game/lobby.js";
import { requireUser, wrapper } from "../middleware.js";

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

  // mockLobbyData - no requireUser
  fastify.post("/mockLobbyData", wrapper(Lobby.mockLobbyData));

  // /getServerLobbyStatus - no requireUser
  fastify.post(
    "/getServerLobbyStatus",
    wrapper(Lobby.getServerLobbyStatus)
  );

  // serverStarted - with requireUser
  fastify.post("/serverStarted", wrapper(Lobby.serverStarted));
}
