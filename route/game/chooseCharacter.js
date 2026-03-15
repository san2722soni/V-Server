import ChooseCharacter from "../../service/game/chooseCharacter.js";
import { requireUser, wrapper } from "../middleware.js";

export default async function choooseCharacterRoutes(fastify) {
    fastify.addHook('preHandler', requireUser);

    fastify.post('/chooseCharacter', wrapper(ChooseCharacter.choose) );
}