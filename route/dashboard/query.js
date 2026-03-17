import { requireAdmin, requireDeveloper, wrapper } from "../middleware.js";
import QueryService from "../../service/dashboard/queryService.js";

export default async function query(fastify) {
  // CREATE - Create new query
  fastify.post(
    "/createQuery",
    { preHandler: [requireDeveloper] },
    wrapper(QueryService.createQuery)
  );

  // READ - Get all queries
  fastify.post(
    "/getQueries",
    { preHandler: [requireDeveloper] },
    wrapper(QueryService.getQueries)
  );

  // UPDATE - Update query (ownership check in service)
  fastify.post(
    "/updateQuery",
    { preHandler: [requireDeveloper] },
    wrapper(QueryService.updateQuery)
  );

  // DELETE - Delete query (ownership check in service)
  fastify.post(
    "/deleteQuery",
    { preHandler: [requireDeveloper] },
    wrapper(QueryService.deleteQuery)
  );

  // APPROVE - Admin approves/rejects query
  fastify.post(
    "/approveQuery",
    { preHandler: [requireAdmin] },
    wrapper(QueryService.approveQuery)
  );

  // EXECUTE - Execute an approved query
  fastify.post(
    "/executeQuery",
    { preHandler: [requireDeveloper] },
    wrapper(QueryService.executeQuery)
  );
}