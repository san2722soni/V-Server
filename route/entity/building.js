import Building from '../../service/entity/building.js';
import { wrapper } from "../middleware.js";

export default async function buildingRoutes(fastify) {
    fastify.get(
        '/',
        wrapper(Building.getById)
    );
    fastify.post(
        '/',
        wrapper(Building.create)
    );
    fastify.put(
        '/',
        wrapper(Building.update)
    );
    fastify.delete(
        '/',
        wrapper(Building.deleteBuilding)
    );
    fastify.get(
        '/allActive',
        wrapper(() => Building.getAllBuildings({ isActive: true }))
    );
}
