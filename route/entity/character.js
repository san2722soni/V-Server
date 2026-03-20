import Character from '../../service/entity/character.js';
import { requireAdmin, wrapper } from "../middleware.js";

export default async function characterRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireAdmin },
        wrapper(Character.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireAdmin },
        wrapper(Character.create)
    );
    fastify.put(
        '/',
        { preHandler: requireAdmin },
        wrapper(Character.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireAdmin },
        wrapper(Character.deleteCharacter)
    );
    fastify.get(
        '/allActive',
        { preHandler: requireAdmin },
        wrapper(() => Character.getAllCharacters({ isActive: true }))
    );
}
