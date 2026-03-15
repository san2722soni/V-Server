import InfoService from '../../service/game/info.js';
import { requireAdmin, requireDeveloper, requireUser, wrapper } from '../middleware.js';

export default async function Info(fastify) {
    fastify.get(
        '/characters',
        { preHandler: [requireUser] },
        wrapper(InfoService.getActiveCharacters)
    );
    fastify.get(
        '/buildings',
        { preHandler: [requireUser] },
        wrapper(InfoService.getActiveBuildings)
    );
    fastify.get(
        '/inventory',
        { preHandler: [requireUser] },
        wrapper(InfoService.getActiveInventory)
    );
    fastify.get(
        '/global-config',
        { preHandler: [requireUser] },
        wrapper(InfoService.getGlobalConfig)
    );
    fastify.post('/serverData', wrapper(InfoService.serverData));
}