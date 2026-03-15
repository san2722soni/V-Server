import Inventory from '../../service/entity/inventory.js';
import { wrapper } from "../middleware.js";

export default async function inventoryRoutes(fastify) {
    fastify.get(
        '/',
        wrapper(Inventory.getById)
    );
    fastify.post(
        '/',
        wrapper(Inventory.create)
    );
    fastify.put(
        '/',
        wrapper(Inventory.update)
    );
    fastify.delete(
        '/',
        wrapper(Inventory.deleteInventory)
    );
    fastify.get(
        '/allActive',
        wrapper(() => Inventory.getAllInventory({ isActive: true }))
    );
}
