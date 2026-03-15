import character from './character.js';
import building from './building.js';
import inventory from './inventory.js';
import globalConfig from './globalConfig.js';

export default async function router(fastify) {
    fastify.register(character, { prefix: '/character' });
    fastify.register(building, { prefix: '/building' });
    fastify.register(inventory, { prefix: '/inventory' });
    fastify.register(globalConfig, { prefix: '/global-config' });
}