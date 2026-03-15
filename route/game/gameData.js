import GameData from "../../service/game/gameData.js";
import { wrapper } from "../middleware.js";

export default async function gameDataRoutes(fastify){
    fastify.post('/gameData', wrapper(GameData.gameData));
}