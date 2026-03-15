import Characters from '../../service/game/info.js';
import { requireAdmin, requireDeveloper, requireUser, wrapper } from '../middleware.js';

export default async function Info(fastify) {
    fastify.get(
        '/characters',
        { preHandler: [requireUser] },
        wrapper(Characters.getActiveCharacters)
    );
    fastify.post('/serverData', wrapper(Characters.serverData));
}