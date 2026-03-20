import GameOver from "../../service/game/gameOver.js";
import { requireServer, wrapper } from "../middleware.js";

export default async function gameOverRoutes(fastify){
    fastify.post('/gameOver', { preHandler: requireServer }, wrapper(GameOver.gameOver));
}
