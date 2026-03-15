import user  from "./user.js";
import developer from "./developer.js";
import refreshRoutes from "./refresh.js";

export default async function authRoutes(fastify) {
    fastify.register(user, { prefix: '/user' });
    fastify.register(developer, { prefix: '/developer' });
    fastify.register(refreshRoutes, { prefix: '/refresh' });
}