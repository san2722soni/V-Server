import { wrapper } from "../middleware.js";
import Developer from "../../service/auth/developer.js"

export default async function developer(fastify){
    fastify.post('/login', wrapper(Developer.login));
    fastify.post('/verifyDeveloper', wrapper(Developer.verifyDeveloper));
}