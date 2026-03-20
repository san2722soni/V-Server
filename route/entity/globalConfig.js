import GlobalConfig from '../../service/entity/globalConfig.js';
import { requireAdmin, wrapper } from "../middleware.js";

export default async function globalConfigRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireAdmin },
        wrapper(GlobalConfig.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireAdmin },
        wrapper(GlobalConfig.create)
    );
    fastify.put(
        '/',
        { preHandler: requireAdmin },
        wrapper(GlobalConfig.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireAdmin },
        wrapper(GlobalConfig.deleteConfig)
    );
    fastify.delete(
        '/all',
        { preHandler: requireAdmin },
        wrapper(GlobalConfig.getAll)
    );
}
