import { wrapper } from "../middleware.js";
import User from '../../service/auth/user.js';

export default async function user(fastify){
    fastify.post('/login', wrapper(User.login));
    fastify.post('/verifyOtp', wrapper(User.verifyOtp));
}
