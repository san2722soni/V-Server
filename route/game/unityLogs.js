import { wrapper, requireUser } from "../middleware.js";
import LogBulkService from "../../service/game/unityLogs.js";

export default async function unityLogRoutes(fastify) {

  // Bulk normal logs
  fastify.post(
    "/logs",
    { preHandler: requireUser },
    wrapper(LogBulkService.bulkInsertLogs)
  );

  // Bulk error logs
  fastify.post(
    "/errors",
    { preHandler: requireUser },
    wrapper(LogBulkService.bulkInsertErrors)
  );
}
