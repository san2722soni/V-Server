import UserProfileService from "../../service/game/userProfile.js";
import { requireUser, wrapper } from "../middleware.js";

export default async function userProfileRoutes(fastify) {
    fastify.addHook('preHandler', requireUser);

    fastify.get('/', wrapper(UserProfileService.getProfile));
    fastify.post('/name', wrapper(UserProfileService.updateName));
    fastify.post('/bulk', wrapper(UserProfileService.getProfiles));
}
