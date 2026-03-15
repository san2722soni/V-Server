import { requireAdmin, wrapper } from "../middleware.js";
import ClientBuild from "../../service/dashboard/clientBuild.js";

export default async function clientBuilds(fastify) {

  // Create new client build
  fastify.post(
    "/createBuild",
    { preHandler: [requireAdmin] },
    wrapper(ClientBuild.createBuild)
  );

  // Get all client builds
  fastify.get(
    "/getBuilds",
    { preHandler: [requireAdmin] },
    wrapper(ClientBuild.getBuilds)
  );

  // Delete client build by id 
  fastify.post(
    "/deleteBuild",
    { preHandler: [requireAdmin] },
    wrapper(ClientBuild.deleteBuild)
  );

  // Set active client build
  fastify.post(
    "/setActive",
    { preHandler: [requireAdmin] },
    wrapper(ClientBuild.setActiveBuild)
  );

  // Build status callback (called by build server via curl)
  fastify.post(
    "/buildStatus",
    wrapper(ClientBuild.buildStatus)
  );

  // Get current build status from Redis
  fastify.get(
    "/getCurrentStatus",
    { preHandler: [requireAdmin] },
    wrapper(ClientBuild.getCurrentBuildStatus)
  );

  // Get build logs from S3
  fastify.post(
    "/getLogs",
    { preHandler: [requireAdmin] },
    wrapper(ClientBuild.getBuildLogs)
  );

  // Force reset build status (manual recovery for stuck builds)
  fastify.post(
    "/forceReset",
    { preHandler: [requireAdmin] },
    wrapper(ClientBuild.forceResetBuildStatus)
  );

  // Manual timeout check (useful for debugging)
  fastify.post(
    "/checkTimeout",
    { preHandler: [requireAdmin] },
    wrapper(async (data) => {
      const hasTimedOut = await ClientBuild.checkBuildTimeout();
      return {
        success: true,
        message: hasTimedOut ? "Client build timeout detected and reset" : "No timeout detected",
        data: { hasTimedOut }
      };
    })
  );
}