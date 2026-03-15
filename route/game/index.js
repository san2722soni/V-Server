import Info from './info.js';
import matchmaking from './matchmaking.js'
import lobby from './lobby.js';
import choooseCharacterRoutes from './chooseCharacter.js';
import killPlayerRoutes from './killPlayer.js';
import gameOverRoutes from './gameOver.js';
import gameDataRoutes from './gameData.js';
import unityLogRoutes from './unityLogs.js';
import userProfileRoutes from './userProfile.js';

export default async function router(fastify){
    fastify.register(Info, { prefix: '/info' });
    fastify.register(lobby, {prefix : '/lobby'});
    fastify.register(matchmaking, {prefix: '/matchmaking'});
    fastify.register(killPlayerRoutes);
    fastify.register(choooseCharacterRoutes);
    fastify.register(gameOverRoutes);
    fastify.register(gameDataRoutes);
    fastify.register(unityLogRoutes,  {prefix: '/unityLogs' });
    fastify.register(userProfileRoutes, { prefix: '/userProfile' });
};