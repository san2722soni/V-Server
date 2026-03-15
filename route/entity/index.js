import character from './character.js';

export default async function router(fastify) {
    fastify.register(character, { prefix: '/character' });
}