import Building from '../../service/entity/building.js';
import { requireAdmin, requireDeveloper, requireUser, wrapper } from "../middleware.js";

export default async function buildingRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireUser },
        wrapper(Building.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Building.create)
    );
    fastify.put(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Building.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Building.deleteBuilding)
    );
    fastify.get(
        '/allActive',
        { preHandler: requireUser },
        wrapper(() => Building.getAllBuildings({ isActive: true }))
    );
}
