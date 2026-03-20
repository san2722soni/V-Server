import Inventory from '../../service/entity/inventory.js';
import { requireAdmin, wrapper } from "../middleware.js";

export default async function inventoryRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireAdmin },
        wrapper(Inventory.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireAdmin },
        wrapper(Inventory.create)
    );
    fastify.put(
        '/',
        { preHandler: requireAdmin },
        wrapper(Inventory.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireAdmin },
        wrapper(Inventory.deleteInventory)
    );
    fastify.get(
        '/allActive',
        { preHandler: requireAdmin },
        wrapper(() => Inventory.getAllInventory({ isActive: true }))
    );
}
