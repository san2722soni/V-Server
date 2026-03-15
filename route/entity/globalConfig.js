import GlobalConfig from '../../service/entity/globalConfig.js';
import { wrapper } from "../middleware.js";

export default async function globalConfigRoutes(fastify) {
    fastify.get(
        '/',
        wrapper(GlobalConfig.getById)
    );
    fastify.post(
        '/',
        wrapper(GlobalConfig.create)
    );
    fastify.put(
        '/',
        wrapper(GlobalConfig.update)
    );
    fastify.delete(
        '/',
        wrapper(GlobalConfig.deleteConfig)
    );
    fastify.delete(
        '/all',
        wrapper(GlobalConfig.getAll)
    );
}
