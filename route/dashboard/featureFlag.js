import FeatureFlag from "../../service/dashboard/featureFlag.js";
import { checkAccess, requireAdmin, requireDeveloper, wrapper } from "../middleware.js";

export default async function featureFlag(fastify) {

  fastify.post(
    "/getFeatureFlags",
    { preHandler: requireDeveloper},
    wrapper(FeatureFlag.getFeatureFlags)
  );

  // Developer can create (admin also passes developer check)
  fastify.post(
    "/createFeatureFlag",
    { preHandler: [requireDeveloper, checkAccess('feature_flags')] },
    wrapper(FeatureFlag.createFeatureFlag)
  );

  // ✅ Only admin can update
  fastify.post(
    "/updateFeatureFlag",
    { preHandler: requireAdmin},
    wrapper(FeatureFlag.updateFeatureFlag)
  );

  // ✅ Only admin can delete
  fastify.post(
    "/deleteFeatureFlag",
    { preHandler: requireAdmin},
    wrapper(FeatureFlag.deleteFeatureFlag)
  );

  // ✅ Developer (and admin) can read flag by name
  fastify.post(
    "/getFeatureFlagByName",
    wrapper(FeatureFlag.getFeatureFlagByName)
  );
}
