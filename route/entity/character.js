import Character from '../../service/entity/character.js';
import { requireDeveloper, requireUser, wrapper } from "../middleware.js";

export default async function characterRoutes(fastify) {
    fastify.get(
        '/',
        { preHandler: requireUser },
        wrapper(Character.getById)
    );
    fastify.post(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Character.create)
    );
    fastify.put(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Character.update)
    );
    fastify.delete(
        '/',
        { preHandler: requireDeveloper },
        wrapper(Character.deleteCharacter)
    );
    fastify.get(
        '/allActive',
        { preHandler: requireUser },
        wrapper(() => Character.getAllCharacters({ isActive: true }))
    );
}
