// scripts/parser-config.js
// Centralized configuration for API Parser
// Modify this file to customize how your API is parsed and documented

module.exports = {
  // Service configurations - define your main services
  services: {
    auth: {
      id: "auth-service",
      title: "Auth Service",
      emoji: "🔐",
      category: "Authentication",
      description: "User & Developer authentication flows",
      detailedDescription: "Handles user and developer authentication including OTP verification and token refresh",
      allowedRoles: ["admin", "developer", "user"]
    },
    game: {
      id: "game-service",
      title: "Game Service",
      emoji: "🎮",
      category: "Game Management",
      description: "Game management, matchmaking, and lobby systems",
      detailedDescription: "Handles all game-related operations including characters, matchmaking, lobbies, and game sessions",
      allowedRoles: ["admin", "developer", "user"]
    },
    entity: {
      id: "entity-service",
      title: "Entity Service",
      emoji: "🏷️",
      category: "Data Management",
      description: "Character and game entity management",
      detailedDescription: "CRUD operations for game entities like characters",
      allowedRoles: ["admin", "developer"]
    },
    dashboard: {
      id: "dashboard-service",
      title: "Dashboard Service",
      emoji: "📊",
      category: "Administration",
      description: "Developer dashboard and admin features",
      detailedDescription: "Administrative features for developers and system management",
      allowedRoles: ["admin"]
    }
  },

  // Emoji mappings for routes and endpoints
  emojis: {
    // Auth related
    login: "👤",
    verify: "✅",
    verifyOtp: "✅",
    developer: "👨‍💻",
    refresh: "🔄",
    logout: "🚪",
    
    // Game related
    matchmaking: "🔍",
    findAMatch: "🔍",
    findMatch: "🔍",
    getStatus: "⏱️",
    cancelSearch: "❌",
    
    // Lobby related
    lobby: "🏠",
    createLobby: "🏠",
    joinLobby: "🚪",
    leaveLobby: "👋",
    getLobbyStatus: "📊",
    startMatch: "🎯",
    
    // Character related
    chooseCharacter: "🎭",
    character: "👤",
    
    // Game actions
    killPlayer: "💀",
    gameOver: "🏁",
    gameData: "📊",
    
    // Info
    info: "ℹ️",
    serverData: "🖥️",
    
    // CRUD operations
    get: "🔍",
    create: "➕",
    update: "✏️",
    delete: "🗑️",
    list: "📋",
    
    // Dashboard
    featureFlag: "🚩",
    build: "🔨",
    mongoQuery: "📊",
    getDevelopers: "👥",
    createDeveloper: "👨‍💻",
    
    // Default fallbacks by HTTP method
    GET: "📖",
    POST: "📝",
    PUT: "✏️",
    DELETE: "🗑️",
    PATCH: "🔧"
  },

  // Role detection rules (order matters - first match wins)
  roleRules: [
    // Admin-only paths
    {
      pattern: /dashboard|admin|featureFlag|mongoQuery|developer/i,
      roles: ["admin"]
    },
    // Developer paths
    {
      pattern: /entity|character/i,
      roles: ["admin", "developer"]
    },
    // Game paths (authenticated users)
    {
      pattern: /game|matchmaking|lobby/i,
      middleware: ["requireUser", "requireDeveloper"],
      roles: ["admin", "developer", "user"]
    },
    // Default authenticated
    {
      middleware: ["requireUser", "requireDeveloper"],
      roles: ["admin", "developer", "user"]
    },
    // Public (no auth)
    {
      default: true,
      roles: ["admin", "developer", "user"]
    }
  ],

  // Path transformations
  pathTransforms: {
    // Add /api prefix
    addApiPrefix: true,
    
    // Custom path mappings
    // Example: '/auth/login' -> '/authentication/login'
    mappings: {
      // '/old/path': '/new/path'
    }
  },

  // Parser options
  parser: {
    // Directories to scan
    routeDir: 'route',
    serviceDir: 'service',
    
    // Files to exclude
    excludeFiles: ['index.js', 'middleware.js'],
    
    // Output location
    outputFile: 'lib/backend-data.js',
    
    // Enable verbose logging
    verbose: true,
    
    // Include request/response examples
    includeExamples: true,
    
    // Auto-generate groups for multiple routes
    autoGroup: true,
    
    // Minimum routes for auto-grouping
    minRoutesForGroup: 2
  },

  // Response templates
  responseTemplates: {
    success: {
      "200": {
        description: "Success",
        schema: { success: "boolean" }
      }
    },
    created: {
      "201": {
        description: "Created successfully",
        schema: { success: "boolean", id: "string" }
      }
    },
    error: {
      "400": { description: "Bad Request" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Not Found" },
      "500": { description: "Internal Server Error" }
    }
  },

  // Custom edge rules (for connecting services)
  customEdges: [
    // Auth to services
    { from: "user-verify", to: "game-service" },
    { from: "dev-verify", to: "game-service" },
    { from: "dev-verify", to: "entity-service" },
    { from: "dev-verify", to: "dashboard-service" }
  ],

  // Group configurations
  groupConfig: {
    // Force these routes into groups even if only 1 route
    forceGroup: [],
    
    // Never group these routes
    neverGroup: ['login', 'verify', 'refresh'],
    
    // Custom group names
    customNames: {
      // 'matchmaking': 'Match Making System',
      // 'featureFlag': 'Feature Flags'
    }
  },

  // Documentation settings
  documentation: {
    // Include in generated docs
    includeRequestBody: true,
    includeResponses: true,
    includeHeaders: true,
    includeExamples: true,
    
    // Auto-generate descriptions
    autoDescriptions: true,
    
    // Template for auto-generated descriptions
    descriptionTemplate: (method, path, functionName) => {
      return `${method} /api${path} - ${functionName}`;
    }
  },

  // Validation
  validation: {
    // Warn about missing service definitions
    warnMissingServices: true,
    
    // Warn about routes without service implementations
    warnOrphanRoutes: true,
    
    // Warn about duplicate route IDs
    warnDuplicateIds: true
  }
};