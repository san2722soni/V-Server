import killPlayer from "../../service/game/killPlayer.js";
import { wrapper } from "../middleware.js";

export default async function killPlayerRoutes(fastify){
    fastify.post('/killPlayer', wrapper(killPlayer.Kill));
}