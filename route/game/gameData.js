import GameData from "../../service/game/gameData.js";
import { requireServer, wrapper } from "../middleware.js";

export default async function gameDataRoutes(fastify){
    fastify.post('/gameData', { preHandler: requireServer }, wrapper(GameData.gameData));
}
