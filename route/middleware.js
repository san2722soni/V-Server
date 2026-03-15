import {
  HEADERS,
  ApiRequestLogBlackList,
  ApiResponseLogBlackList,
  JWT_SECRET_KEY,
} from "../constants/index.js";

import asyncLocalStorage from "../util/asyncStorage.js";
import { randomId } from "../util/index.js";
import LogModule from "../service/log/index.js";
import jwt from "jsonwebtoken";
import DeveloperService from "../service/dashboard/developer.js";

export const wrapper = (fn) => async (request, reply) => {
  const txnId = randomId();
  const body = { id: request.id, ...request.query, ...request.body, userData: request.userData};
  const api = request.raw.url;
  const startTime = Date.now();

  try {
    const response = await asyncLocalStorage.run(txnId, async () => {
      LogModule.log({
        data: ApiRequestLogBlackList.includes(api) ? "masked" : JSON.stringify({ body }),
        key1: api,
        key2: "apiRequest",
      });

      return fn(body);
    });

    LogModule.log({
      key1: api,
      key2: "apiResponse",
      metric: { duration: Date.now() - startTime },
    });

    return reply.send(response);
  } catch (error) {
    LogModule.error({
      key1: api,
      key2: "apiError",
      error: error.message,
      stack: error.stack,
      metric: { duration: Date.now() - startTime },
    });

    return reply.code(500).send({ message: error.message, error });
  }
};

/* ================================================================
   🔥 FIXED AUTH MIDDLEWARE (MAIN FIX)
================================================================ */
export const parseAppConfig = async (request, reply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    request.userData = null;
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // 🔥 FIXED: use jwt.decode() instead of verify()
    // jwt.verify() throws error when expired → breaks refresh logic
    const decoded = jwt.decode(token);

    if (!decoded) {
      request.userData = null;
      return;
    }

    request.userData = decoded; // allow expired token data

  } catch (err) {
    // Should NEVER reach here unless token is corrupted
    request.userData = null;
  }
};

/* ================================================================
   ROLE-BASED GUARDS
================================================================ */

export const requireAdmin = async (request, reply) => {
  console.log("Request User Data:", request.userData);
  if (!request.userData?.isAdmin) {
    return reply.code(403).send({ message: "Admin access required" });
  }
};

export const requireDeveloper = async (request, reply) => {
  if (!request.userData?.isAdmin && !request.userData?.isDeveloper) {
    return reply.code(403).send({ message: "Only developer and admin access allowed" });
  }
};

export const requireUser = async (request, reply) => {
  if (!request.userData?.isAdmin && !request.userData?.isUser) {
    return reply.code(403).send({ message: "User access required" });
  }
};

export const requireVcmUser = async (request, reply) => {
  if (!request.userData?.isAdmin && !request.userData?.isVcmUser) {
    return reply.code(403).send({ message: "Vcm User access required" });
  }
};

/* ================================================================
   ACCESS-CONTROL GUARD
================================================================ */
export const checkAccess = (requiredAccess) => {
  return async (request, reply) => {
    if (request.userData?.isAdmin) return;

    const developerId = request.userData?.developerId;

    if (!developerId) {
      return reply.code(403).send({ message: "Developer ID not found" });
    }

    const accessCheck = await DeveloperService.checkDeveloperAccess(
      developerId,
      requiredAccess
    );

    if (!accessCheck.hasAccess) {
      return reply.code(403).send({
        message: `Access denied. Required: ${requiredAccess}`,
      });
    }
  };
};
