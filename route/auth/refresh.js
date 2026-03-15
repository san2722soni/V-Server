import { wrapper } from "../middleware.js";
import RefreshService from '../../service/auth/refreshToken.js';

export default async function refreshRoutes(fastify){
    fastify.post('/newToken', wrapper(RefreshService.refreshAccessToken));
}
