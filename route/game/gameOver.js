import GameOver from "../../service/game/gameOver.js";
import { wrapper } from "../middleware.js";

export default async function gameOverRoutes(fastify){
    fastify.post('/gameOver', wrapper(GameOver.gameOver));
}