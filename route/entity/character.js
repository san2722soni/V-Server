import Character from '../../service/entity/character.js';
import { wrapper } from "../middleware.js";

export default async function characterRoutes(fastify) {
    fastify.get(
        '/',
        wrapper(Character.getById)
    );
    fastify.post(
        '/',
        wrapper(Character.create)
    );
    fastify.put(
        '/',
        wrapper(Character.update)
    );
    fastify.delete(
        '/',
        wrapper(Character.deleteCharacter)
    );
}