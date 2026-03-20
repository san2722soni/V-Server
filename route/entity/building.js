import Building from '../../service/entity/building.js';
import { requireAdmin, wrapper } from "../middleware.js";

export default async function buildingRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireAdmin },
        wrapper(Building.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireAdmin },
        wrapper(Building.create)
    );
    fastify.put(
        '/',
        { preHandler: requireAdmin },
        wrapper(Building.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireAdmin },
        wrapper(Building.deleteBuilding)
    );
    fastify.get(
        '/allActive',
        { preHandler: requireAdmin },
        wrapper(() => Building.getAllBuildings({ isActive: true }))
    );
}
