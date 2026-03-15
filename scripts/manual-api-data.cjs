// scripts/manual-api-data.cjs
// Manual API metadata - Add detailed info for each endpoint here
// The parser will automatically merge this with auto-detected routes

/**
 * NAMING CONVENTION:
 * - Key format: "{fileName}-{functionName}"
 * - Example: "user-login" for /route/auth/user.js -> login()
 *
 * STRUCTURE:
 * - headers: Array of header objects
 * - requestBody: Object with parameter definitions
 * - responses: Object with status codes as keys
 * - errors: Array of error patterns
 */

module.exports = {
  // ==================== AUTH SERVICE - USER ====================

  // /auth/user/login
  "user-login": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      email: {
        type: "string",
        required: true,
        description: "User email address",
        example: "user@example.com",
      },
    },
    responses: {
      200: {
        description: "OTP sent successfully",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: true, message: "OTP sent successfully" }],
      },
      400: {
        description: "Invalid email format",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Validation error", message: "Invalid email format" },
        ],
      },
      500: {
        description: "Server error during OTP generation",
        schema: { error: "string", message: "string" },
        examples: [{ error: "Server error", message: "Failed to send OTP" }],
      },
    },
    errors: [
      { type: "catch", description: "Login process failed", variable: "error" },
      {
        type: "LoggedError",
        key1: "login",
        key2: "login_failed",
        description: "Login process failed and logged",
      },
    ],
  },

  // /auth/user/verifyOtp
  "user-verifyOtp": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      email: {
        type: "string",
        required: true,
        description: "User email address",
        example: "user@example.com",
      },
      otp: {
        type: "string",
        required: true,
        description: '6-digit OTP code (use "1247" for dev bypass)',
        example: "123456",
      },
    },
    responses: {
      200: {
        description: "OTP verified successfully, tokens returned",
        schema: {
          refreshToken: "string",
          accessToken: "string",
        },
        examples: [
          {
            refreshToken: "refresh_token_abc123xyz",
            accessToken:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTRhYmMxMjM0NTYiLCJpc1VzZXIiOnRydWUsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoxNzAwMDg2Mzk5fQ.signature",
          },
        ],
      },
      400: {
        description: "Invalid OTP or email",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Invalid email or otp", message: "OTP validation failed" },
        ],
      },
      500: {
        description: "Server error during verification",
        schema: { error: "string", message: "string" },
        examples: [{ error: "Server error", message: "Failed to verify OTP" }],
      },
    },
    errors: [
      { type: "throw", description: "Invalid email or otp" },
      {
        type: "catch",
        description: "OTP verification failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "verifyOtp",
        key2: "invalid_otp",
        description: "Invalid OTP provided",
      },
      {
        type: "LoggedError",
        key1: "verifyOtp",
        key2: "verify_failed",
        description: "OTP verification failed and logged",
      },
    ],
  },

  // ==================== AUTH SERVICE - DEVELOPER ====================

  // /auth/developer/login
  "developer-login": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      email: {
        type: "string",
        required: true,
        description: "Developer email address (must be registered)",
        example: "dev@example.com",
      },
    },
    responses: {
      200: {
        description: "Developer OTP sent successfully",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: true, message: "OTP sent successfully" }],
      },
      400: {
        description: "Invalid email format",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Validation error", message: "Invalid email format" },
        ],
      },
      500: {
        description: "Server error during OTP generation",
        schema: { error: "string", message: "string" },
        examples: [{ error: "Server error", message: "Failed to send OTP" }],
      },
    },
    errors: [
      {
        type: "catch",
        description: "Developer login failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "developer_login",
        key2: "failed",
        description: "Developer login failed and logged",
      },
    ],
  },

  // /auth/developer/verifyDeveloper
  "developer-verifyDeveloper": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      email: {
        type: "string",
        required: true,
        description: "Developer email address",
        example: "dev@example.com",
      },
      otp: {
        type: "string",
        required: true,
        description: '6-digit OTP code (use "1247" for dev bypass)',
        example: "123456",
      },
    },
    responses: {
      200: {
        description: "Developer verified successfully, tokens returned",
        schema: {
          refreshToken: "string",
          accessToken: "string",
        },
        examples: [
          {
            refreshToken: "refresh_token_dev_abc123",
            accessToken:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZlbG9wZXJJZCI6IjY1NGFiYzEyMzQ1NiIsImVtYWlsIjoiZGV2QGV4YW1wbGUuY29tIiwiaXNBZG1pbiI6ZmFsc2UsImlzRGV2ZWxvcGVyIjp0cnVlLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MTcwMDA4NjM5OX0.signature",
          },
        ],
      },
      400: {
        description: "Invalid OTP or developer not found",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Invalid email or otp", message: "OTP validation failed" },
          {
            error: "Create a developer first to proceed.",
            message: "Developer account does not exist",
          },
        ],
      },
      500: {
        description: "Server error during verification",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Server error", message: "Failed to verify developer" },
        ],
      },
    },
    errors: [
      { type: "throw", description: "Invalid email or otp" },
      { type: "throw", description: "Create a developer first to proceed." },
      {
        type: "catch",
        description: "Developer verification failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "verify_developer",
        key2: "invalid_otp",
        description: "Invalid developer OTP",
      },
      {
        type: "LoggedError",
        key1: "verify_developer",
        key2: "not_found",
        description: "Developer not found",
      },
      {
        type: "LoggedError",
        key1: "verify_developer",
        key2: "failed",
        description: "Developer verification failed and logged",
      },
    ],
  },

  // ==================== AUTH SERVICE - REFRESH TOKEN ====================

  // /auth/refresh/newToken
  "refresh-refreshAccessToken": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      accessToken: {
        type: "string",
        required: true,
        description: "Expired or expiring JWT access token",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      refreshToken: {
        type: "string",
        required: true,
        description: "Valid refresh token",
        example: "refresh_token_abc123xyz",
      },
    },
    responses: {
      200: {
        description: "Token refreshed successfully",
        schema: {
          success: "boolean",
          message: "string",
          accessToken: "string",
          refreshToken: "string",
        },
        examples: [
          {
            success: true,
            message: "Access token refreshed for user",
            accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token...",
            refreshToken: "refresh_token_abc123xyz",
          },
          {
            success: true,
            message: "Access token refreshed for developer",
            accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token...",
            refreshToken: "refresh_token_new_abc123",
          },
        ],
      },
      400: {
        description: "Invalid tokens or missing parameters",
        schema: { error: "string", message: "string" },
        examples: [
          {
            error: "Missing required parameters: accessToken and refreshToken",
            message: "Both tokens required",
          },
          {
            error: "Invalid or expired access token",
            message: "Token validation failed",
          },
          {
            error: "Invalid token structure",
            message: "Token does not contain valid user/developer ID",
          },
          {
            error: "Invalid or incorrect refresh token",
            message: "Refresh token mismatch",
          },
        ],
      },
      401: {
        description: "Refresh token expired",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Refresh token expired", message: "Please login again" },
        ],
      },
      404: {
        description: "Account not found",
        schema: { error: "string", message: "string" },
        examples: [
          {
            error: "Account not found",
            message: "User or developer account does not exist",
          },
        ],
      },
      500: {
        description: "Server error during token refresh",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Server error", message: "Failed to refresh token" },
        ],
      },
    },
    errors: [
      {
        type: "throw",
        description:
          "Missing required parameters: accessToken and refreshToken",
      },
      { type: "throw", description: "Invalid or expired access token" },
      { type: "throw", description: "Invalid token structure" },
      { type: "throw", description: "Account not found" },
      { type: "throw", description: "Invalid or incorrect refresh token" },
      { type: "throw", description: "Refresh token expired" },
      { type: "catch", description: "Token refresh failed", variable: "error" },
      {
        type: "LoggedError",
        key1: "refresh_token",
        key2: "failed",
        description: "Token refresh failed and logged",
      },
    ],
  },

  // ==================== AUTH SERVICE - VCM USER ====================

  // /auth/user/login
  "vcmUser-login": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      email: {
        type: "string",
        required: true,
        description: "vcmUser email address",
        example: "vcmUser@example.com",
      },
    },
    responses: {
      200: {
        description: "OTP sent successfully",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: true, message: "OTP sent successfully" }],
      },
      400: {
        description: "Invalid email format",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Validation error", message: "Invalid email format" },
        ],
      },
      500: {
        description: "Server error during OTP generation",
        schema: { error: "string", message: "string" },
        examples: [{ error: "Server error", message: "Failed to send OTP" }],
      },
    },
    errors: [
      { type: "catch", description: "Login process failed", variable: "error" },
      {
        type: "LoggedError",
        key1: "login",
        key2: "login_failed",
        description: "Login process failed and logged",
      },
    ],
  },

  // /auth/user/verifyOtp
  "vcmUser-verifyOtp": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      email: {
        type: "string",
        required: true,
        description: "User email address",
        example: "user@example.com",
      },
      email: {
        type: "name",
        required: true,
        description: "Full Name",
        example: "John..",
      },
      otp: {
        type: "string",
        required: true,
        description: '6-digit OTP code (use "1247" for dev bypass)',
        example: "123456",
      },
    },
    responses: {
      200: {
        description: "OTP verified successfully, tokens returned",
        schema: {
          refreshToken: "string",
          accessToken: "string",
        },
        examples: [
          {
            refreshToken: "refresh_token_abc123xyz",
            accessToken:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTRhYmMxMjM0NTYiLCJpc1VzZXIiOnRydWUsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoxNzAwMDg2Mzk5fQ.signature",
          },
        ],
      },
      400: {
        description: "Invalid OTP or email",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Invalid email or otp", message: "OTP validation failed" },
        ],
      },
      500: {
        description: "Server error during verification",
        schema: { error: "string", message: "string" },
        examples: [{ error: "Server error", message: "Failed to verify OTP" }],
      },
    },
    errors: [
      { type: "throw", description: "Invalid email or otp" },
      {
        type: "catch",
        description: "OTP verification failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "verifyOtp",
        key2: "invalid_otp",
        description: "Invalid OTP provided",
      },
      {
        type: "LoggedError",
        key1: "verifyOtp",
        key2: "verify_failed",
        description: "OTP verification failed and logged",
      },
    ],
  },

  // ==================== GAME SERVICE - MATCHMAKING ====================

  "matchmaking-findAMatch": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      userData: {
        type: "object",
        required: true,
        properties: { userId: "string" },
      },
    },
    responses: {
      200: {
        description: "Match result",
        schema: {
          matchFound: "boolean",
          game: "object|null",
          queueLength: "number|null",
        },
        examples: [
          { matchFound: true, game: { _id: "g1" } },
          { matchFound: false, queueLength: 3 },
        ],
      },
    },
    errors: [
      { type: "throw", description: "Error creating new game" },
      {
        type: "LoggedError",
        key1: "findAMatch",
        key2: "failed",
        description: "Matchmaking failed",
      },
    ],
  },

  "matchmaking-getStatus": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      userData: {
        type: "object",
        required: true,
        properties: { userId: "string" },
      },
    },
    responses: {
      200: {
        description: "Match status",
        schema: {
          inGame: "boolean",
          inQueue: "boolean",
          gameId: "string|null",
          secretKey: "string|null",
        },
        examples: [
          { inGame: true, gameId: "g1", secretKey: "abc123" },
          { inGame: false, inQueue: true },
        ],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "getStatus",
        key2: "failed",
        description: "Failed to get status",
      },
    ],
  },

  "matchmaking-cancelSearch": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      userData: {
        type: "object",
        required: true,
        properties: { userId: "string" },
      },
    },
    responses: {
      200: {
        description: "Search cancelled",
        schema: { remove: "boolean" },
        examples: [{ remove: true }],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "cancelSearch",
        key2: "failed",
        description: "Failed to cancel",
      },
    ],
  },

  // ==================== GAME SERVICE - LOBBY ====================

  "lobby-createLobby": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      userData: { type: "object", required: true },
      lobbyName: { type: "string", required: true, example: "My Squad" },
    },
    responses: {
      200: {
        description: "Lobby created",
        schema: { lobbyId: "string", lobbyName: "string", isLeader: "boolean", numberOfPlayers: "number", tree: "object" },
        examples: [{ lobbyId: "12345", isLeader: true, numberOfPlayers: 1, tree: { player: 1, index: 0, positionMap: {}, filledTree: [] } }],
      },
      400: {
        description: "Already in game/lobby",
        schema: { message: "string" },
        examples: [{ message: "You are already in an active game" }],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "createLobby",
        key2: "already_in_game",
        description: "User in active game",
      },
      {
        type: "LoggedError",
        key1: "createLobby",
        key2: "generation_failed",
        description: "Lobby ID generation failed",
      },
    ],
  },

  "lobby-joinLobby": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      userData: { type: "object", required: true },
      lobbyId: { type: "string", required: true, example: "12345" },
    },
    responses: {
      200: {
        description: "Joined",
        schema: { lobbyId: "string", members: "array", leaderId: "string", numberOfPlayers: "number", tree: "object" },
        examples: [
          { lobbyId: "12345", members: [{ userId: "u1" }], leaderId: "u1", numberOfPlayers: 2, tree: { player: 2, index: 1, positionMap: {}, filledTree: [] } },
        ],
      },
      404: { description: "Lobby not found", schema: { message: "string" } },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "joinLobby",
        key2: "not_found",
        description: "Lobby not found",
      },
    ],
  },

  "lobby-startMatch": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      userData: { type: "object", required: true },
      lobbyId: { type: "string", required: true },
    },
    responses: {
      200: {
        description: "Match started",
        schema: {
          gameId: "string",
          saltKey: "string",
          players: "array",
          teams: "object",
          totalPlayers: "number",
          serverIP: "string|null",
        },
        examples: [{ gameId: "g1", saltKey: "abc123", players: [{ userId: "u1", clientId: 1, team: "A" }], teams: { teamA: [{ userId: "u1", clientId: 1 }], teamB: [] }, totalPlayers: 2, serverIP: "1.2.3.4" }],
      },
      403: { description: "Not leader", schema: { message: "string" } },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "startMatch",
        key2: "not_leader",
        description: "Only leader can start",
      },
    ],
  },

  "lobby-getLobbyStatus": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      userData: { type: "object", required: true },
      lobbyId: { type: "string", required: true },
    },
    responses: {
      200: {
        description: "Status",
        schema: {
          inLobby: "boolean",
          inGame: "boolean",
          gameId: "string|null",
          tree: "object|null",
        },
        examples: [
          { inLobby: true, inGame: false, tree: { player: 1, index: 0, positionMap: {}, filledTree: [] } },
          { inLobby: false, inGame: true, gameId: "g1", tree: null },
        ],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "getLobbyStatus",
        key2: "not_found",
        description: "Lobby/game not found",
      },
    ],
  },

  "lobby-leaveLobby": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      userData: { type: "object", required: true },
      lobbyId: { type: "string", required: true },
    },
    responses: {
      200: {
        description: "Left or destroyed",
        schema: { lobbyDestroyed: "boolean", remainingMembers: "number" },
        examples: [{ lobbyDestroyed: true, remainingMembers: 0 }],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "leaveLobby",
        key2: "in_active_game",
        description: "Cannot leave in game",
      },
    ],
  },

  "lobby-serverStarted": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      ipAddress: { type: "string", required: true },
      gameId: { type: "string", required: true },
    },
    responses: {
      200: {
        description: "Server started",
        schema: { message: "string", currentGame: "object" },
        examples: [{ message: "Game started", currentGame: { _id: "g1" } }],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "serverStarted",
        key2: "game_not_found",
        description: "Game not found",
      },
    ],
  },

  "lobby-mockLobbyData": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      serverIP: { type: "string", required: true },
      clientIndex: { type: "number", required: true },
    },
    responses: {
      200: {
        description: "Mock game",
        schema: { gameId: "string", players: "array", tree: "object" },
        examples: [{ gameId: "mock1", players: [{ clientId: 1 }], tree: { player: 1, index: 0, positionMap: {}, filledTree: [] } }],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "mockLobbyData",
        key2: "failed",
        description: "Mock creation failed",
      },
    ],
  },

  "lobby-getServerLobbyStatus": {
    allowedRoles: [],
    headers: [],
    requestBody: {
      lobbyId: { type: "string", required: true },
    },
    responses: {
      200: {
        description: "Server status",
        schema: {
          inLobby: "boolean",
          inGame: "boolean",
          serverIP: "string|null",
          gameId: "string|null",
          tree: "object|null",
        },
        examples: [
          { inLobby: true, inGame: false, tree: { player: 1, index: 0, positionMap: {}, filledTree: [] } },
          { inLobby: false, inGame: true, serverIP: "1.2.3.4", gameId: "g1", tree: null },
        ],
      },
    },
    errors: [
      {
        type: "LoggedError",
        key1: "getServerLobbyStatus",
        key2: "not_found",
        description: "Not found",
      },
    ],
  },

  // ==================== GAME SERVICE - OTHER ENDPOINTS ====================

  // /game/chooseCharacter
  "chooseCharacter-choose": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      id: {
        type: "string",
        required: true,
        description: "Character ObjectId",
        example: "507f1f77bcf86cd799439011",
      },
      userData: {
        type: "object",
        required: true,
        description: "User data with userId",
        example: { userId: "user_123" },
      },
    },
    responses: {
      200: {
        description: "Character selected/updated",
        schema: { message: "string", userProfile: "object" },
        examples: [
          {
            message: "Character selected successfully!",
            userProfile: {
              userId: "user_123",
              characterId: "507f1f77bcf86cd799439011",
            },
          },
          {
            message: "Character already selected",
            userProfile: {
              userId: "user_123",
              characterId: "507f1f77bcf86cd799439011",
            },
          },
          {
            message: "Character updated successfully!",
            userProfile: {
              userId: "user_123",
              characterId: "507f1f77bcf86cd799439011",
            },
          },
        ],
      },
      400: {
        description: "Validation errors",
        schema: { error: "string", message: "string" },
        examples: [
          {
            error: "Please provide a character id",
            message: "Character ID required",
          },
          {
            error: "Please provide a valid character id",
            message: "Invalid ObjectId format",
          },
          {
            error: "Character with this id does not exist",
            message: "Character not found",
          },
        ],
      },
      500: {
        description: "Server error",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Character selection failed", message: "Server error" },
        ],
      },
    },
    errors: [
      { type: "throw", description: "Please provide a character id" },
      { type: "throw", description: "Please provide a valid character id" },
      { type: "throw", description: "Character with this id does not exist" },
      {
        type: "catch",
        description: "Character selection failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "choose_character",
        key2: "failed",
        description: "Character selection failed",
      },
    ],
  },

  // /game/killPlayer
  "killPlayer-Kill": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      id: {
        type: "string",
        required: true,
        description: "Player ObjectId",
        example: "507f1f77bcf86cd799439011",
      },
      userId: {
        type: "string",
        required: true,
        description: "User ObjectId",
        example: "507f1f77bcf86cd799439012",
      },
    },
    responses: {
      200: {
        description: "Player kill result",
        schema: { success: "boolean", message: "string" },
        examples: [
          {
            success: true,
            message: "Player user_123 removed from game game_456",
          },
          {
            success: false,
            message: "Player not found in any active game",
          },
        ],
      },
      400: {
        description: "Validation errors",
        schema: { error: "string", message: "string" },
        examples: [
          {
            error: "Please provide a player id",
            message: "Player ID required",
          },
          { error: "Please provide user id", message: "User ID required" },
          {
            error: "Incorrect id format of id or userId",
            message: "Invalid ObjectId format",
          },
        ],
      },
      500: {
        description: "Server error",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Player kill process failed", message: "Server error" },
        ],
      },
    },
    errors: [
      { type: "throw", description: "Please provide a player id" },
      { type: "throw", description: "Please provide user id" },
      { type: "throw", description: "Incorrect id format of id or userId" },
      {
        type: "catch",
        description: "Player kill process failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "killPlayer",
        key2: "not_found",
        description: "Player not found in any active game",
      },
      {
        type: "LoggedError",
        key1: "killPlayer",
        key2: "failed",
        description: "Player kill process failed",
      },
    ],
  },

  // /game/gameOver
  "gameOver-gameOver": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      gameId: {
        type: "string",
        required: true,
        description: "Game ObjectId",
        example: "507f1f77bcf86cd799439011",
      },
    },
    responses: {
      200: {
        description: "Game over processed",
        schema: { success: "boolean", message: "string", status: "object" },
        examples: [
          {
            success: true,
            message: "Game over processed successfully",
            status: { _id: "game_123", completed: true },
          },
        ],
      },
      400: {
        description: "Bad request",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Game ID is required" },
          { success: false, message: "Game not found" },
        ],
      },
      500: {
        description: "Server error",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Game over process failed" }],
      },
    },
    errors: [
      {
        type: "catch",
        description: "Game over process failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "gameOver",
        key2: "failed",
        description: "Game over process failed",
      },
      {
        type: "LoggedError",
        key1: "stopServer",
        key2: "failed",
        description: "EC2 server termination failed",
      },
    ],
  },

  // /game/gameData
  "gameData-gameData": {
    allowedRoles: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      gameId: {
        type: "string",
        required: true,
        description: "Game ObjectId",
        example: "507f1f77bcf86cd799439011",
      },
      userData: {
        type: "object",
        required: false,
        description: "Optional user data",
        example: { userId: "user_123" },
      },
    },
    responses: {
      200: {
        description: "Game data retrieved",
        schema: { status: "number", message: "string", data: "object" },
        examples: [
          {
            status: 200,
            message: "Game data fetched successfully",
            data: { _id: "game_123", saltKey: "abc123", players: [] },
          },
        ],
      },
      400: {
        description: "Game ID required",
        schema: { status: "number", message: "string" },
        examples: [{ status: 400, message: "Game ID is required" }],
      },
      404: {
        description: "Game not found",
        schema: { status: "number", message: "string" },
        examples: [{ status: 404, message: "Game not found" }],
      },
    },
    errors: [
      {
        type: "catch",
        description: "Game data fetch failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "gameData",
        key2: "failed",
        description: "Game data fetch failed",
      },
    ],
  },

  // ==================== GAME SERVICE - INFO ====================
  "info-getActiveCharacters": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {},
    responses: {
      200: {
        description: "Active characters",
        schema: { type: "array" },
        examples: [[{ _id: "c1", isActive: true }]],
      },
    },
    errors: [
      { type: "throw", description: "No characters found" },
      {
        type: "LoggedError",
        key1: "getActiveCharacters",
        key2: "failed",
        description: "Failed to fetch",
      },
    ],
  },

  "info-getActiveCharacterById": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      id: { type: "string", required: true },
    },
    responses: {
      200: {
        description: "Active character",
        schema: { _id: "string", isActive: true },
        examples: [{ _id: "c1", isActive: true }],
      },
    },
    errors: [
      { type: "throw", description: "Missing character ID" },
      { type: "throw", description: "Invalid character ID format" },
      { type: "throw", description: "Character not found" },
      {
        type: "LoggedError",
        key1: "getActiveCharacterById",
        key2: "failed",
        description: "Failed",
      },
    ],
  },

  "info-serverData": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      id: { type: "string", required: true, description: "Game ID" },
    },
    responses: {
      200: {
        description: "Game and active characters",
        schema: { game: "object", characters: "array" },
        examples: [{ game: { _id: "g1" }, characters: [] }],
      },
    },
    errors: [
      { type: "throw", description: "Game ID required!" },
      { type: "throw", description: "Invalid Game ID format" },
      { type: "throw", description: "Game not found" },
      { type: "throw", description: "No characters found" },
      {
        type: "LoggedError",
        key1: "serverData",
        key2: "failed",
        description: "Failed to fetch",
      },
    ],
  },
  // ==================== GAME SERVICE - UNITY LOGS ====================

  // /unityLogs/logs
  "unityLogs-bulkInsertLogs": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],

    requestBody: {
      logs: {
        type: "array",
        required: true,
        description: "Array of Unity gameplay/application logs",
        example: [
          {
            type: "info",
            message: "Player connected to server",
            timestamp: 1732550000000,
            playerId: "p_123",
            details: { level: 5, scene: "MainMenu" },
          },
        ],
      },
    },

    responses: {
      200: {
        description: "Logs inserted successfully",
        schema: { success: "boolean", insertedCount: "number" },
        examples: [{ success: true, insertedCount: 2 }],
      },

      400: {
        description: "Invalid log data format",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Validation error", message: "Logs array required" },
        ],
      },

      500: {
        description: "Server error while saving logs",
        schema: { error: "string", message: "string" },
        examples: [{ error: "Server error", message: "Failed to insert logs" }],
      },
    },

    errors: [
      {
        type: "catch",
        description: "Bulk log insert failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "unityLogs",
        key2: "log_bulk_insert_failed",
        description: "Unity logs insertion failure logged",
      },
    ],
  },
  // /unityLogs/errors
  "unityLogs-bulkInsertErrors": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],

    requestBody: {
      errors: {
        type: "array",
        required: true,
        description: "Array of Unity runtime errors/crash reports",
        example: [
          {
            type: "exception",
            message: "NullReferenceException in PlayerController",
            timestamp: 1732550200000,
            deviceId: "device_45",
            stackTrace: "PlayerController.Update() → Movement.cs:12",
          },
        ],
      },
    },

    responses: {
      200: {
        description: "Errors inserted successfully",
        schema: { success: "boolean", insertedCount: "number" },
        examples: [{ success: true, insertedCount: 3 }],
      },

      400: {
        description: "Invalid error array format",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Validation error", message: "Errors array required" },
        ],
      },

      500: {
        description: "Server error while storing error logs",
        schema: { error: "string", message: "string" },
        examples: [
          { error: "Server error", message: "Failed to insert error logs" },
        ],
      },
    },

    errors: [
      {
        type: "catch",
        description: "Bulk error insert failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "unityErrors",
        key2: "error_bulk_insert_failed",
        description: "Unity error logs failure logged",
      },
    ],
  },

  // ==================== DASHBOARD SERVICE - BUILD ====================

  "build-createBuild": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      message: {
        type: "string",
        required: true,
        description: "Build description or commit message",
        example: "Added new game features",
      },
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Build creation initiated successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "object",
        },
        examples: [
          {
            success: true,
            message: "Build created successfully",
            data: {
              _id: "654def789012",
              version: "v12",
              message: "Added new game features",
              isActive: false,
              isDeleted: false,
            },
          },
        ],
      },
      400: {
        description: "Build server busy or validation failed",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Build already in progress" },
          { success: false, message: "Message is required" },
        ],
      },
      500: {
        description: "Build creation failed",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Failed to create build" }],
      },
    },
    errors: [
      { type: "throw", description: "Build already in progress" },
      { type: "throw", description: "Message is required" },
      {
        type: "catch",
        description: "Build status check failed",
        variable: "err",
      },
      {
        type: "LoggedError",
        key1: "createBuild",
        key2: "status_check_failed",
        description: "Build server not idle",
      },
      {
        type: "LoggedError",
        key1: "createBuild",
        key2: "validation_failed",
        description: "Required fields missing",
      },
      {
        type: "LoggedError",
        key1: "createBuild",
        key2: "creation_failed",
        description: "Database creation failed",
      },
    ],
  },

  "build-getBuilds": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Builds retrieved successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "array",
        },
        examples: [
          {
            success: true,
            message: "Builds retrieved successfully",
            data: [
              {
                _id: "654def789012",
                version: "v12",
                message: "Added new game features",
                isActive: true,
                isDeleted: false,
                createdAt: "2024-01-15T10:30:00.000Z",
              },
            ],
          },
        ],
      },
      400: {
        description: "No builds found",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "No builds found" }],
      },
      500: {
        description: "Failed to fetch builds",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Database query failed" }],
      },
    },
    errors: [
      { type: "throw", description: "No builds found" },
      {
        type: "catch",
        description: "Failed to fetch builds",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "getBuilds",
        key2: "no_builds",
        description: "No builds in database",
      },
      {
        type: "LoggedError",
        key1: "getBuilds",
        key2: "failed",
        description: "Database query failed",
      },
    ],
  },

  "build-deleteBuild": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      buildId: {
        type: "string",
        required: true,
        description: "MongoDB build ID to delete",
        example: "654def789012",
      },
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Build marked as deleted successfully",
        schema: {
          success: "boolean",
          message: "string",
        },
        examples: [
          {
            success: true,
            message: "Build marked as deleted successfully",
          },
        ],
      },
      400: {
        description: "Build ID required or not found",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Build ID is required" },
          { success: false, message: "No build found with that ID" },
        ],
      },
      500: {
        description: "Build deletion failed",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Failed to delete build" }],
      },
    },
    errors: [
      { type: "throw", description: "Build ID is required" },
      { type: "throw", description: "No build found with that ID" },
      {
        type: "catch",
        description: "Build deletion failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "deleteBuild",
        key2: "validation_failed",
        description: "Build ID missing",
      },
      {
        type: "LoggedError",
        key1: "deleteBuild",
        key2: "not_found",
        description: "Build not found in database",
      },
      {
        type: "LoggedError",
        key1: "deleteBuild",
        key2: "failed",
        description: "Build deletion failed",
      },
    ],
  },

  "build-setActiveBuild": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      buildId: {
        type: "string",
        required: true,
        description: "MongoDB build ID to set as active",
        example: "654def789012",
      },
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Build set as active successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "object",
        },
        examples: [
          {
            success: true,
            message: "Build set to active successfully",
            data: {
              _id: "654def789012",
              version: "v12",
              isActive: true,
            },
          },
        ],
      },
      400: {
        description: "Build ID required or not found",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Build ID is required" },
          { success: false, message: "No build found with that ID" },
        ],
      },
      500: {
        description: "Failed to set active build",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Database update failed" }],
      },
    },
    errors: [
      { type: "throw", description: "Build ID is required" },
      { type: "throw", description: "No build found with that ID" },
      {
        type: "catch",
        description: "Failed to set active build",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "setActiveBuild",
        key2: "validation_failed",
        description: "Build ID missing",
      },
      {
        type: "LoggedError",
        key1: "setActiveBuild",
        key2: "not_found",
        description: "Build not found for activation",
      },
      {
        type: "LoggedError",
        key1: "setActiveBuild",
        key2: "failed",
        description: "Active build update failed",
      },
    ],
  },

  // ==================== DASHBOARD SERVICE - DEVELOPER ====================

  "developer-createDeveloper": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      email: {
        type: "string",
        required: true,
        description: "Developer email address",
        example: "dev@example.com",
      },
      name: {
        type: "string",
        required: true,
        description: "Developer full name",
        example: "John Developer",
      },
      role: {
        type: "string",
        required: true,
        description: "Developer role/title",
        example: "Backend Developer",
      },
      gender: {
        type: "string",
        required: true,
        description: "Developer gender",
        example: "male",
      },
      permission: {
        type: "object",
        required: true,
        description: "Developer permissions object",
        example: { feature_flags: true, builds: false },
      },
      isAdmin: {
        type: "boolean",
        required: false,
        description: "Whether developer has admin privileges",
        example: false,
      },
      access: {
        type: "array",
        required: false,
        description: "Array of access strings",
        example: ["feature_flags", "builds"],
      },
    },
    responses: {
      200: {
        description: "Developer created successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "object",
        },
        examples: [
          {
            success: true,
            message: "Developer created successfully",
            data: {
              _id: "654dev123456",
              email: "dev@example.com",
              isAdmin: false,
              access: ["feature_flags"],
              profile: {
                name: "John Developer",
                role: "Backend Developer",
                gender: "male",
                permissions: { feature_flags: true },
              },
            },
          },
        ],
      },
      400: {
        description: "Validation failed or developer exists",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Name is required" },
          {
            success: false,
            message: "Developer with this email already exists",
          },
        ],
      },
      500: {
        description: "Developer creation failed",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Failed to create developer!" }],
      },
    },
    errors: [
      { type: "throw", description: "Name is required" },
      { type: "throw", description: "Email is required" },
      { type: "throw", description: "Role is required" },
      { type: "throw", description: "Gender is required" },
      { type: "throw", description: "Permissions are required" },
      {
        type: "throw",
        description: "Developer with this email already exists",
      },
      { type: "throw", description: "Failed to create developer!" },
      {
        type: "catch",
        description: "Developer creation failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "createDeveloper",
        key2: "failed",
        description: "Developer creation failed",
      },
    ],
  },

  "developer-getDevelopers": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Developers retrieved successfully",
        schema: {
          success: "boolean",
          data: "array",
          count: "number",
        },
        examples: [
          {
            success: true,
            data: [
              {
                _id: "654dev123456",
                email: "dev@example.com",
                isAdmin: false,
                access: ["feature_flags"],
                profile: {
                  name: "John Developer",
                  role: "Backend Developer",
                  gender: "male",
                },
              },
            ],
            count: 1,
          },
        ],
      },
      400: {
        description: "No developers found",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "No developers found" }],
      },
      500: {
        description: "Failed to fetch developers",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Database query failed" }],
      },
    },
    errors: [
      { type: "throw", description: "No developers found" },
      {
        type: "catch",
        description: "Failed to fetch developers",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "getDevelopers",
        key2: "failed",
        description: "Database query failed",
      },
    ],
  },

  "developer-getDeveloper": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      id: {
        type: "string",
        required: true,
        description: "MongoDB developer ID",
        example: "654dev123456",
      },
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Developer retrieved successfully",
        schema: {
          success: "boolean",
          data: "object",
        },
        examples: [
          {
            success: true,
            data: {
              _id: "654dev123456",
              email: "dev@example.com",
              isAdmin: false,
              access: ["feature_flags"],
              profile: {
                name: "John Developer",
                role: "Backend Developer",
                gender: "male",
              },
            },
          },
        ],
      },
      400: {
        description: "Developer ID required or not found",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Developer ID is required" },
          { success: false, message: "Developer not found" },
        ],
      },
      500: {
        description: "Failed to fetch developer",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Database query failed" }],
      },
    },
    errors: [
      { type: "throw", description: "Developer ID is required" },
      { type: "throw", description: "Developer not found" },
      {
        type: "catch",
        description: "Failed to fetch developer",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "getDeveloper",
        key2: "failed",
        description: "Developer fetch failed",
      },
    ],
  },

  "developer-updateDeveloper": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      id: {
        type: "string",
        required: true,
        description: "MongoDB developer ID to update",
        example: "654dev123456",
      },
      name: {
        type: "string",
        required: false,
        description: "Updated developer name",
        example: "John Updated",
      },
      role: {
        type: "string",
        required: false,
        description: "Updated developer role",
        example: "Senior Developer",
      },
      gender: {
        type: "string",
        required: false,
        description: "Updated gender",
        example: "male",
      },
      permission: {
        type: "object",
        required: false,
        description: "Updated permissions",
        example: { feature_flags: true, builds: true },
      },
      isAdmin: {
        type: "boolean",
        required: false,
        description: "Updated admin status",
        example: true,
      },
      access: {
        type: "array",
        required: false,
        description: "Updated access array",
        example: ["feature_flags", "builds", "users"],
      },
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Developer updated successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "object",
        },
        examples: [
          {
            success: true,
            message: "Developer updated successfully",
            data: {
              _id: "654dev123456",
              email: "dev@example.com",
              isAdmin: true,
              access: ["feature_flags", "builds"],
              profile: {
                name: "John Updated",
                role: "Senior Developer",
                gender: "male",
              },
            },
          },
        ],
      },
      400: {
        description: "Developer ID required or not found",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Developer ID is required" },
          { success: false, message: "Developer not found" },
        ],
      },
      500: {
        description: "Failed to update developer",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Database update failed" }],
      },
    },
    errors: [
      { type: "throw", description: "Developer ID is required" },
      { type: "throw", description: "Developer not found" },
      {
        type: "catch",
        description: "Failed to update developer",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "updateDeveloper",
        key2: "failed",
        description: "Developer update failed",
      },
    ],
  },

  "developer-deleteDeveloper": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      id: {
        type: "string",
        required: true,
        description: "MongoDB developer ID to delete",
        example: "654dev123456",
      },
      userData: {
        type: "object",
        required: true,
        description: "User authentication data",
        example: { userId: "654abc123456", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Developer deleted successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "object",
        },
        examples: [
          {
            success: true,
            message: "Developer deleted successfully",
            data: {
              id: "654dev123456",
              email: "dev@example.com",
            },
          },
        ],
      },
      400: {
        description: "Developer ID required or not found",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Developer ID is required" },
          { success: false, message: "Developer not found" },
        ],
      },
      500: {
        description: "Failed to delete developer",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Database deletion failed" }],
      },
    },
    errors: [
      { type: "throw", description: "Developer ID is required" },
      { type: "throw", description: "Developer not found" },
      {
        type: "catch",
        description: "Failed to delete developer",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "deleteDeveloper",
        key2: "failed",
        description: "Developer deletion failed",
      },
    ],
  },

  // ==================== DASHBOARD SERVICE - FEATURE FLAG ====================

  "featureFlag-getFeatureFlags": {
    allowedRoles: ["developer"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <developerToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      userData: {
        type: "object",
        required: true,
        description: "Developer authentication data",
        example: { developerId: "654dev123456", isDeveloper: true },
      },
      query: {
        type: "object",
        required: false,
        description: "Optional query parameters",
        example: {},
      },
    },
    responses: {
      200: {
        description: "Feature flags retrieved successfully",
        schema: {
          success: "boolean",
          data: "array",
          count: "number",
        },
        examples: [
          {
            success: true,
            data: [
              {
                name: "new_ui_feature",
                type: "boolean",
                value: "true",
                createdBy: "654dev123456",
                createdAt: "2024-01-15T10:30:00.000Z",
              },
            ],
            count: 1,
          },
        ],
      },
      500: {
        description: "Failed to fetch feature flags",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Redis connection failed" }],
      },
    },
    errors: [
      {
        type: "catch",
        description: "Failed to fetch feature flags",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "getFeatureFlags",
        key2: "failed",
        description: "Feature flags fetch failed",
      },
    ],
  },

  "featureFlag-createFeatureFlag": {
    allowedRoles: ["developer"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <developerToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      name: {
        type: "string",
        required: true,
        description: "Unique feature flag name",
        example: "new_ui_feature",
      },
      type: {
        type: "string",
        required: true,
        description: "Feature flag type (boolean, integer, string)",
        example: "boolean",
      },
      value: {
        type: "string",
        required: true,
        description: "Feature flag value",
        example: "true",
      },
      userData: {
        type: "object",
        required: true,
        description: "Developer authentication data",
        example: { developerId: "654dev123456", isDeveloper: true },
      },
    },
    responses: {
      200: {
        description: "Feature flag created successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "object",
        },
        examples: [
          {
            success: true,
            message: "Feature flag created successfully",
            data: {
              name: "new_ui_feature",
              type: "boolean",
              value: "true",
              createdBy: "654dev123456",
              createdAt: "2024-01-15T10:30:00.000Z",
            },
          },
        ],
      },
      400: {
        description: "Validation failed or flag exists",
        schema: { success: "boolean", message: "string" },
        examples: [
          {
            success: false,
            message: "Missing required fields: name, type, value",
          },
          {
            success: false,
            message: "Feature flag with this name already exists",
          },
        ],
      },
      500: {
        description: "Feature flag creation failed",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Redis storage failed" }],
      },
    },
    errors: [
      {
        type: "throw",
        description: "Missing required fields: name, type, value",
      },
      {
        type: "throw",
        description: "Feature flag with this name already exists",
      },
      {
        type: "catch",
        description: "Feature flag creation failed",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "createFeatureFlag",
        key2: "validation_failed",
        description: "Required fields missing",
      },
      {
        type: "LoggedError",
        key1: "createFeatureFlag",
        key2: "already_exists",
        description: "Feature flag name exists",
      },
      {
        type: "LoggedError",
        key1: "createFeatureFlag",
        key2: "failed",
        description: "Feature flag creation failed",
      },
    ],
  },

  "featureFlag-updateFeatureFlag": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      name: {
        type: "string",
        required: true,
        description: "Feature flag name to update",
        example: "new_ui_feature",
      },
      value: {
        type: "string",
        required: true,
        description: "New feature flag value",
        example: "false",
      },
      userData: {
        type: "object",
        required: true,
        description: "Admin authentication data",
        example: { developerId: "654admin123", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Feature flag updated successfully",
        schema: {
          success: "boolean",
          message: "string",
          data: "object",
        },
        examples: [
          {
            success: true,
            message: "Feature flag updated successfully",
            data: {
              name: "new_ui_feature",
              type: "boolean",
              value: "false",
              updatedBy: "654admin123",
              updatedAt: "2024-01-15T11:30:00.000Z",
            },
          },
        ],
      },
      400: {
        description: "Validation failed or flag not found",
        schema: { success: "boolean", message: "string" },
        examples: [
          {
            success: false,
            message: "Feature flag name and value are required",
          },
          { success: false, message: "Feature flag not found" },
        ],
      },
      500: {
        description: "Feature flag update failed",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Redis update failed" }],
      },
    },
    errors: [
      {
        type: "throw",
        description: "Feature flag name and value are required",
      },
      { type: "throw", description: "Feature flag not found" },
      {
        type: "catch",
        description: "Failed to update feature flag",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "updateFeatureFlag",
        key2: "validation_failed",
        description: "Name/value missing",
      },
      {
        type: "LoggedError",
        key1: "updateFeatureFlag",
        key2: "not_found",
        description: "Feature flag not found",
      },
      {
        type: "LoggedError",
        key1: "updateFeatureFlag",
        key2: "failed",
        description: "Feature flag update failed",
      },
    ],
  },

  "featureFlag-deleteFeatureFlag": {
    allowedRoles: ["admin"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <adminToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      name: {
        type: "string",
        required: true,
        description: "Feature flag name to delete",
        example: "new_ui_feature",
      },
      userData: {
        type: "object",
        required: true,
        description: "Admin authentication data",
        example: { developerId: "654admin123", isAdmin: true },
      },
    },
    responses: {
      200: {
        description: "Feature flag deleted successfully",
        schema: {
          success: "boolean",
          message: "string",
        },
        examples: [
          {
            success: true,
            message: "Feature flag deleted successfully",
          },
        ],
      },
      400: {
        description: "Feature flag name required or not found",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Feature flag name is required" },
          { success: false, message: "Feature flag not found" },
        ],
      },
      500: {
        description: "Feature flag deletion failed",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Redis deletion failed" }],
      },
    },
    errors: [
      { type: "throw", description: "Feature flag name is required" },
      { type: "throw", description: "Feature flag not found" },
      {
        type: "catch",
        description: "Failed to delete feature flag",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "deleteFeatureFlag",
        key2: "validation_failed",
        description: "Name missing",
      },
      {
        type: "LoggedError",
        key1: "deleteFeatureFlag",
        key2: "not_found",
        description: "Feature flag not found",
      },
      {
        type: "LoggedError",
        key1: "deleteFeatureFlag",
        key2: "failed",
        description: "Feature flag deletion failed",
      },
    ],
  },

  "featureFlag-getFeatureFlagByName": {
    allowedRoles: ["developer"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <developerToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      name: {
        type: "string",
        required: true,
        description: "Feature flag name to retrieve",
        example: "new_ui_feature",
      },
      userData: {
        type: "object",
        required: true,
        description: "Developer authentication data",
        example: { developerId: "654dev123456", isDeveloper: true },
      },
    },
    responses: {
      200: {
        description: "Feature flag retrieved successfully",
        schema: {
          success: "boolean",
          data: "object",
        },
        examples: [
          {
            success: true,
            data: {
              name: "new_ui_feature",
              type: "boolean",
              value: "true",
              createdBy: "654dev123456",
              createdAt: "2024-01-15T10:30:00.000Z",
            },
          },
        ],
      },
      400: {
        description: "Feature flag name required",
        schema: { success: "boolean", message: "string" },
        examples: [
          { success: false, message: "Feature flag name is required" },
        ],
      },
      404: {
        description: "Feature flag not found",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Feature flag not found" }],
      },
      500: {
        description: "Failed to fetch feature flag",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Redis query failed" }],
      },
    },
    errors: [
      { type: "throw", description: "Feature flag name is required" },
      { type: "throw", description: "Feature flag not found" },
      {
        type: "catch",
        description: "Failed to fetch feature flag",
        variable: "error",
      },
      {
        type: "LoggedError",
        key1: "getFeatureFlagByName",
        key2: "validation_failed",
        description: "Name missing",
      },
      {
        type: "LoggedError",
        key1: "getFeatureFlagByName",
        key2: "not_found",
        description: "Feature flag not found",
      },
      {
        type: "LoggedError",
        key1: "getFeatureFlagByName",
        key2: "failed",
        description: "Feature flag fetch failed",
      },
    ],
  },

  // ==================== DASHBOARD SERVICE - MONGO QUERY ====================

  "mongoService-runQuery": {
    allowedRoles: ["developer"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <developerToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      text: {
        type: "string",
        required: true,
        description: "MongoDB collection query",
        example: "db.collection('users').find().toArray()",
      },
    },
    responses: {
      200: {
        description: "Query executed",
        schema: { success: "boolean", data: "array|object" },
        examples: [{ success: true, data: [{ _id: "abc", name: "John" }] }],
      },
      400: {
        description: "Bad request",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Query text required" }],
      },
      500: {
        description: "Server error",
        schema: { success: "boolean", message: "string" },
        examples: [{ success: false, message: "Query execution failed: ..." }],
      },
    },
    errors: [
      { type: "throw", description: "Query text required" },
      { type: "throw", description: "Blocked operation detected" },
      {
        type: "LoggedError",
        key1: "runQuery",
        key2: "blocked",
        description: "Dangerous query blocked",
      },
      {
        type: "LoggedError",
        key1: "runQuery",
        key2: "failed",
        description: "Query execution failed",
      },
    ],
  },

  // ==================== ENTITY SERVICE - CHARACTER ====================
  "character-getAllCharacters": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {},
    responses: {
      200: {
        description: "All characters",
        schema: { type: "array", items: { type: "object" } },
        examples: [[{ _id: "c1", health: 100 }]],
      },
      500: {
        description: "No characters found",
        schema: { error: "string" },
        examples: [{ error: "No characters found" }],
      },
    },
    errors: [
      { type: "throw", description: "No characters found" },
      {
        type: "LoggedError",
        key1: "getAllCharacters",
        key2: "failed",
        description: "Failed to fetch all characters",
      },
    ],
  },

  "character-getById": {
    allowedRoles: ["user"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <userToken>",
        type: "auth_header",
        required: true,
      },
    ],
    requestBody: {
      id: {
        type: "string",
        required: false,
        description: "Character ID",
        example: "60d5ec49f1b2c3d5e8f1a2b3",
      },
    },
    responses: {
      200: {
        description: "Character or all characters",
        schema: { type: "object|array" },
        examples: [
          { _id: "c1", health: 100 },
          { message: "...", characters: [] },
        ],
      },
    },
    errors: [
      { type: "throw", description: "Invalid character ID format" },
      { type: "throw", description: "Character not found" },
      {
        type: "LoggedError",
        key1: "getCharacterById",
        key2: "failed",
        description: "Failed to fetch character",
      },
    ],
  },

  "character-create": {
    allowedRoles: ["developer"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <developerToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      health: { type: "number", required: true },
      maxHealth: { type: "number", required: true },
      isActive: { type: "boolean", required: true },
      moveSpeed: { type: "number", required: true },
      attackType: { type: "string", required: true },
      attackRange: { type: "number", required: true },
      level: { type: "number", required: true },
      shield: { type: "number", required: true },
      isVisible: { type: "boolean", required: true },
      activeShield: { type: "boolean", required: true },
      vision: { type: "number", required: true },
      target: { type: "string", required: true },
      weight: { type: "number", required: true },
      inventory: { type: "array", required: true },
      buildingsCanBuild: { type: "array", required: true },
      buildingsCanUse: { type: "array", required: true },
      artifactsCanUse: { type: "array", required: true },
      artifactsCanCraft: { type: "array", required: true },
      resourcesCanCraft: { type: "array", required: true },
    },
    responses: {
      201: {
        description: "Character created",
        schema: { _id: "string", health: "number", additionalFields: "any" },
        examples: [{ _id: "c1", health: 100 }],
      },
    },
    errors: [
      { type: "throw", description: "Missing required fields: ..." },
      {
        type: "LoggedError",
        key1: "createCharacter",
        key2: "failed",
        description: "Failed to create character",
      },
    ],
  },

  "character-update": {
    allowedRoles: ["developer"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <developerToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      id: { type: "string", required: true },
      updates: {
        type: "object",
        required: true,
        description: "Fields to update",
      },
    },
    responses: {
      200: {
        description: "Character updated",
        schema: { _id: "string", updatedFields: "object" },
        examples: [{ _id: "c1", health: 120 }],
      },
    },
    errors: [
      { type: "throw", description: "Missing character ID" },
      { type: "throw", description: "Invalid character ID format" },
      { type: "throw", description: "Character not found" },
      {
        type: "LoggedError",
        key1: "updateCharacter",
        key2: "failed",
        description: "Failed to update",
      },
    ],
  },

  "character-deleteCharacter": {
    allowedRoles: ["developer"],
    headers: [
      {
        name: "Authorization",
        value: "Bearer <developerToken>",
        type: "auth_header",
        required: true,
      },
      {
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      },
    ],
    requestBody: {
      id: { type: "string", required: true },
    },
    responses: {
      200: {
        description: "Character deleted",
        schema: { _id: "string" },
        examples: [{ _id: "c1" }],
      },
    },
    errors: [
      { type: "throw", description: "Missing character ID" },
      { type: "throw", description: "Invalid character ID format" },
      { type: "throw", description: "Character not found" },
      {
        type: "LoggedError",
        key1: "deleteCharacter",
        key2: "failed",
        description: "Failed to delete",
      },
    ],
  },

  /*
  // Copy this template and fill in for new endpoints
  // Naming: '{fileName}-{functionName}'
  
  'fileName-functionName': {
    headers: [
      { name: 'Authorization', value: 'Bearer <userToken|developerToken|adminToken>', type: 'auth_header', required: true },
      { name: 'Content-Type', value: 'application/json', type: 'content_type', required: true }
    ],
    requestBody: {
      paramName: { 
        type: 'string|number|boolean|object|array', 
        required: true|false, 
        description: 'Description of parameter',
        example: 'example value'
      }
    },
    responses: {
      "200": {
        description: "Success description",
        schema: { key: 'type', anotherKey: 'type' },
        examples: [
          { key: 'value', anotherKey: 'value' }
        ]
      },
      "400": {
        description: "Bad request description",
        schema: { error: 'string', message: 'string' },
        examples: [
          { error: 'Error type', message: 'Error message' }
        ]
      },
      "500": {
        description: "Server error",
        schema: { error: 'string', message: 'string' },
        examples: [
          { error: 'Server error', message: 'Error details' }
        ]
      }
    },
    errors: [
      { type: 'throw', description: 'Error message from throw statement' },
      { type: 'catch', description: 'General error caught', variable: 'error' },
      { type: 'LoggedError', key1: 'functionName', key2: 'errorType', description: 'Error logged to monitoring' }
    ]
  },
  */
};
