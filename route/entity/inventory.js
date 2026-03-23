import Inventory from '../../service/entity/inventory.js';
import { requireDeveloper, requireUser, wrapper } from "../middleware.js";

export default async function inventoryRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireUser },
        wrapper(Inventory.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Inventory.create)
    );
    fastify.put(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Inventory.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Inventory.deleteInventory)
    );
    fastify.get(
        '/allActive',
        { preHandler: requireUser },
        wrapper(() => Inventory.getAllInventory({ isActive: true }))
    );
}
