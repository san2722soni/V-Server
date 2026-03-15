import Matchmaking from '../../service/game/matchmaking.js';
import { requireUser, wrapper } from '../middleware.js';

export default async function matchmakingRoutes(fastify) {
   fastify.addHook('preHandler', requireUser);

    fastify.post(
        '/findAMatch',
        wrapper(Matchmaking.findAMatch)
    );
    fastify.post(
        '/cancelSearch',
        wrapper(Matchmaking.cancelSearch)
    );
    fastify.post(
        '/getStatus',
        wrapper(Matchmaking.getStatus)
    );
}