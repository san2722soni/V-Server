import jwt from "jsonwebtoken";
import User from "../../model/User.js";
import Developer from "../../model/Developer.js";
import LogModule from "../../service/log/index.js";
import WhitelistedUserService from "../dashboard/whitelistedUser.js";
import {
  JWT_SECRET_KEY,
  ACCESS_TOKEN_EXPIRE_TIME_IN_SECS,
  REFRESH_TOKEN_EXPIRE_TIME,
} from "../../constants/index.js";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

// Create short-lived access token
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET_KEY, {
    expiresIn: ACCESS_TOKEN_EXPIRE_TIME_IN_SECS,
  });
};

// Create long-lived refresh token
const generateRefreshToken = () => {
  return jwt.sign({}, JWT_SECRET_KEY, {
    expiresIn: REFRESH_TOKEN_EXPIRE_TIME,
  });
};

/* -------------------------------------------------------
   🔥 IMPORTANT FIX:
   We now decode WITHOUT verifying signature (jwt.decode)
   This allows refresh even if the access token is expired.
------------------------------------------------------- */
const safelyDecodeAccessToken = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded) throw new Error("Invalid access token");
  return decoded;
};

// Determine if this is a Developer OR User account
const getAccount = async (decodedToken) => {
  if (decodedToken.developerId) {
    return {
      account: await Developer.findById(decodedToken.developerId),
      isDeveloper: true,
    };
  }

  if (decodedToken.userId) {
    return {
      account: await User.findById(decodedToken.userId),
      isDeveloper: false,
    };
  }

  throw new Error("Invalid token structure");
};

// Validate refresh token ownership + expiration
const validateRefreshToken = (account, refreshToken) => {
  if (account.refreshToken !== refreshToken) {
    throw new Error("Invalid or incorrect refresh token");
  }

  if (!account.tokenEAT || account.tokenEAT <= Date.now()) {
    throw new Error("Refresh token expired");
  }
};

// Should we rotate (replace) refresh token?
const needsTokenUpdate = (account) => {
  return !account.refreshToken || account.tokenEAT <= Date.now();
};

// Issue a new refresh token if needed
const updateRefreshToken = async (account, isDeveloper) => {
  const newRefreshToken = generateRefreshToken();
  const tokenEAT = Date.now() + REFRESH_TOKEN_EXPIRE_TIME;

  const Model = isDeveloper ? Developer : User;

  await Model.findByIdAndUpdate(account._id, {
    refreshToken: newRefreshToken,
    tokenEAT,
  });

  return newRefreshToken;
};

// Create access token based on account type
const createAccessToken = (account, isDeveloper) => {
  if (isDeveloper) {
    return generateAccessToken({
      developerId: account._id,
      email: account.email,
      isAdmin: account.isAdmin,
      isDeveloper: account.isDeveloper,
      profile: account.profile,
      access: account.access,
    });
  }

  return generateAccessToken({
    userId: account._id,
    isUser: true,
  });
};

/* -------------------------------------------------------
   MAIN REFRESH SERVICE — FIXED VERSION
------------------------------------------------------- */
const refreshAccessToken = async (data) => {
  const { accessToken, refreshToken } = data;

  try {
    LogModule.log({
      key1: "refresh_token",
      key2: "start",
      text1: "Token refresh process started",
      text2: `Access token (preview): ${accessToken?.substring(0, 10)}...`,
    });

    if (!accessToken || !refreshToken) {
      throw new Error("Missing required parameters: accessToken and refreshToken");
    }

    /* ----------------------------------------------
       🔥 FIXED: Decode **without verifying**
       - Works even if access token is expired
       - Still safe because refresh token is validated
    ---------------------------------------------- */
    const decodedToken = safelyDecodeAccessToken(accessToken);

    // Fetch account from DB
    const { account, isDeveloper } = await getAccount(decodedToken);

    if (!account) throw new Error("Account not found");

    // In production, check whitelist for User accounts (not Developers)
    if (process.env.NODE_ENV === "production" && !isDeveloper) {
      const allowed = await WhitelistedUserService.isWhitelisted(account.email);
      if (!allowed) {
        throw new Error("Access denied. This email is no longer whitelisted.");
      }
    }

    // Validate refresh token
    validateRefreshToken(account, refreshToken);

    // Rotate refresh token when needed
    let currentRefreshToken = refreshToken;
    if (needsTokenUpdate(account)) {
      currentRefreshToken = await updateRefreshToken(account, isDeveloper);
    }

    // Create new access token
    const newAccessToken = createAccessToken(account, isDeveloper);

    LogModule.log({
      key1: "refresh_token",
      key2: "success",
      text1: "Token refreshed successfully",
      text2: `Type: ${isDeveloper ? "Developer" : "User"}, ID: ${account._id}`,
    });

    return {
      success: true,
      message: `Access token refreshed for ${isDeveloper ? "developer" : "user"}`,
      accessToken: newAccessToken,
      refreshToken: currentRefreshToken,
    };
  } catch (error) {
    LogModule.error({
      key1: "refresh_token",
      key2: "failed",
      text1: "Token refresh failed",
      text2: `Error: ${error.message}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default {
  refreshAccessToken,
};
