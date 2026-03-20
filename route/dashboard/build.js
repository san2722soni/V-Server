import { requireAdmin, requireServer, wrapper } from "../middleware.js";
import Build from "../../service/dashboard/build.js";

export default async function builds(fastify) {
  // CREATE - Create new build
  fastify.post(
    "/createBuild",
    { preHandler: [requireAdmin] },
    wrapper(Build.createBuild)
  );

  // GET - Get all builds
  fastify.get(
    "/getBuilds",
    { preHandler: [requireAdmin] },
    wrapper(Build.getBuilds)
  );

  // DELETE - Delete build by id
  fastify.post(
    "/deleteBuild",
    { preHandler: [requireAdmin] },
    wrapper(Build.deleteBuild)
  );

  // SET ACTIVE - Set active build by id
  fastify.post(
    "/setActive",
    { preHandler: [requireAdmin] },
    wrapper(Build.setActiveBuild)
  );

  // Build status callback (called by build server via curl)
  fastify.post(
    "/buildStatus",
    { preHandler: requireServer },
    wrapper(Build.buildStatus)
  );

  // Get current build status from Redis
  fastify.get(
    "/getCurrentStatus",
    { preHandler: [requireAdmin] },
    wrapper(Build.getCurrentBuildStatus)
  );

  // Get logs 
  fastify.post(
    "/getLogs",
    { preHandler: [requireAdmin] },
    wrapper(Build.getBuildLogs)
  );

  // Force reset build status (manual recovery for stuck builds)
  fastify.post(
    "/forceReset",
    { preHandler: [requireAdmin] },
    wrapper(Build.forceResetBuildStatus)
  );

  // Manual timeout check (useful for debugging)
  fastify.post(
    "/checkTimeout",
    { preHandler: [requireAdmin] },
    wrapper(async (data) => {
      const hasTimedOut = await Build.checkBuildTimeout();
      return {
        success: true,
        message: hasTimedOut ? "Build timeout detected and reset" : "No timeout detected",
        data: { hasTimedOut }
      };
    })
  );
}