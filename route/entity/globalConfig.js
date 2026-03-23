import GlobalConfig from '../../service/entity/globalConfig.js';
import { requireDeveloper, requireUser,  wrapper } from "../middleware.js";

export default async function globalConfigRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireUser },
        wrapper(GlobalConfig.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireDeveloper },
        wrapper(GlobalConfig.create)
    );
    fastify.put(
        '/',
        { preHandler: requireDeveloper },
        wrapper(GlobalConfig.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireDeveloper },
        wrapper(GlobalConfig.deleteConfig)
    );
    fastify.get(
        '/all',
        { preHandler: requireUser },
        wrapper(GlobalConfig.getAll)
    );
}
