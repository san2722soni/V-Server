import { requireAdmin, wrapper } from "../middleware.js";
import WhitelistedUser from "../../service/dashboard/whitelistedUser.js";

export default async function whitelistedUser(fastify) {
    fastify.post('/add',
      { preHandler: [requireAdmin] },
      wrapper(WhitelistedUser.addWhitelistedUser)
    );

    fastify.post('/getAll',
      { preHandler: [requireAdmin] },
      wrapper(WhitelistedUser.getWhitelistedUsers)
    );

    fastify.post('/delete',
      { preHandler: [requireAdmin] },
      wrapper(WhitelistedUser.deleteWhitelistedUser)
    );

    fastify.post('/search',
      { preHandler: [requireAdmin] },
      wrapper(WhitelistedUser.searchWhitelistedUsers)
    );
};
