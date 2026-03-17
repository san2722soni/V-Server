import developer from "./developer.js";
import Developer from "../../service/dashboard/developer.js";
import { requireAdmin, wrapper, requireDeveloper } from "../middleware.js";
import featureFlag from "./featureFlag.js";
import builds from "./build.js";
import clientBuilds from "./clientBuild.js";
import whitelistedUser from "./whitelistedUser.js";
import excalidrawBoard from "./excalidrawBoard.js";
import query from "./query.js";

export default async function dashboardRoutes(fastify) {
    fastify.register(developer, { prefix: '/developer'});

    // route to get developers
    fastify.get('/developers', { preHandler: [requireAdmin] }, wrapper(Developer.getDevelopers));
    
    fastify.register(featureFlag, { 
        prefix: '/featureFlag',
    });

    fastify.register(builds, {
        prefix: '/build',
    });

    fastify.register(clientBuilds, {
        prefix: '/clientBuild',
    });

    fastify.register(whitelistedUser, {
        prefix: '/whitelistedUser',
    });

    fastify.register(excalidrawBoard, {
        prefix: '/excalidraw',
    });

    fastify.register(query, {
        prefix: '/query',
    });

}