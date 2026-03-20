import killPlayer from "../../service/game/killPlayer.js";
import { requireServer, wrapper } from "../middleware.js";

export default async function killPlayerRoutes(fastify){
    fastify.post('/killPlayer', { preHandler: requireServer }, wrapper(killPlayer.Kill));
}
