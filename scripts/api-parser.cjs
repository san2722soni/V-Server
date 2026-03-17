// scripts/api-parser.cjs
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

class ApiParser {
  constructor() {
    this.baseDir = path.join(__dirname, "..");

    // Load config (try both .cjs and .js)
    const cjsPath = path.join(__dirname, "parser-config.cjs");
    const jsPath = path.join(__dirname, "parser-config.js");
    const configPath = fs.existsSync(cjsPath) ? cjsPath : jsPath;
    
    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);

    this.config = config;
    this.routeDir = path.join(this.baseDir, config.parser.routeDir);
    this.serviceDir = path.join(this.baseDir, config.parser.serviceDir);
    this.outputFile = path.join(this.baseDir, config.parser.outputFile);

    this.serviceConfig = config.services;
    this.emojiMap = config.emojis;
    this.roleRules = config.roleRules;
    this.groupConfig = config.groupConfig || { forceGroup: [], neverGroup: [], customNames: {} };
    this.customEdges = config.customEdges || [];

    this.manualApiData = this.loadManualApiData();
  }

  loadManualApiData() {
    try {
      const cjsPath = path.join(__dirname, "manual-api-data.cjs");
      const jsPath = path.join(__dirname, "manual-api-data.js");
      
      let manualDataPath = null;
      if (fs.existsSync(cjsPath)) {
        manualDataPath = cjsPath;
      } else if (fs.existsSync(jsPath)) {
        manualDataPath = jsPath;
      }
      
      if (manualDataPath) {
        delete require.cache[require.resolve(manualDataPath)];
        const manualData = require(manualDataPath);
        console.log(
          "📚 Loaded manual API data:",
          Object.keys(manualData).length,
          "endpoints"
        );
        return manualData;
      } else {
        console.log("⚠️  No manual-api-data file found");
        return {};
      }
    } catch (error) {
      console.error("❌ Failed to load manual API data:", error.message);
      return {};
    }
  }

  getManualData(fileName, functionName, routePath, category) {
    const possibleKeys = [
      fileName && functionName ? `${fileName}-${functionName}` : null,
      routePath && functionName ? `${routePath.split("/").filter(p => p && !p.startsWith(":")).pop()}-${functionName}` : null,
      category && functionName ? `${category}-${functionName}` : null,
      functionName
    ].filter(Boolean);

    for (const key of possibleKeys) {
      if (this.manualApiData[key]) {
        if (this.config.parser.verbose) {
          console.log(`   ✅ Found manual data: "${key}"`);
        }
        return this.manualApiData[key];
      }
    }

    if (this.config.parser.verbose && fileName && functionName) {
      console.log(`   ⚠️  No manual data for: ${fileName}-${functionName}`);
    }

    return null;
  }

  parseFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return parser.parse(content, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Extract JSDoc metadata from a service file for a given function name.
   * Looks for block comments with @description, @param, @returns, @throws, @roles, @example tags.
   */
  extractJSDoc(ast, functionName) {
    if (!ast) return null;

    let jsDocComment = null;

    traverse(ast, {
      // Arrow functions: const login = async (...) => { ... }
      VariableDeclarator(path) {
        if (path.node.id?.name === functionName && path.parent?.leadingComments?.length) {
          const block = path.parent.leadingComments.filter(c => c.type === "CommentBlock").pop();
          if (block) jsDocComment = block.value;
        }
      },
      // Regular function declarations
      FunctionDeclaration(path) {
        if (path.node.id?.name === functionName && path.node.leadingComments?.length) {
          const block = path.node.leadingComments.filter(c => c.type === "CommentBlock").pop();
          if (block) jsDocComment = block.value;
        }
      },
      // export default { login(...) { } } — properties in exported object
      ExportDefaultDeclaration(path) {
        if (path.node.declaration?.type === "ObjectExpression") {
          path.node.declaration.properties.forEach(prop => {
            if (prop.key?.name === functionName && prop.leadingComments?.length) {
              const block = prop.leadingComments.filter(c => c.type === "CommentBlock").pop();
              if (block) jsDocComment = block.value;
            }
          });
        }
      },
    });

    if (!jsDocComment) return null;

    return this.parseJSDocTags(jsDocComment);
  }

  /**
   * Parse raw JSDoc comment text into structured metadata matching manual-api-data shape.
   */
  parseJSDocTags(raw) {
    const result = {};
    const lines = raw.split("\n").map(l => l.replace(/^\s*\*\s?/, "").trim()).filter(Boolean);

    let description = "";
    const params = {};
    const responses = {};
    const errors = [];
    let roles = null;
    let example = null;

    for (const line of lines) {
      if (line.startsWith("@description ")) {
        description = line.slice(13).trim();
      } else if (line.startsWith("@param")) {
        // @param {string} email - User's email address
        const match = line.match(/@param\s+\{(\w+)\}\s+(\w+)\s*-?\s*(.*)/);
        if (match) {
          params[match[2]] = {
            type: match[1],
            required: true,
            description: match[3] || `The ${match[2]} parameter`,
            example: this.getDefaultExample(match[1]),
          };
        }
      } else if (line.startsWith("@returns")) {
        // @returns {200} { success: true, message: "OTP sent" }
        const match = line.match(/@returns\s+\{(\d+)\}\s*(.*)/);
        if (match) {
          const status = match[1];
          let body = match[2].trim();
          try {
            // Try parsing as relaxed JSON
            body = JSON.parse(body.replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
          } catch { /* keep as string */ }
          responses[status] = {
            description: Number(status) < 400 ? "Success" : "Error",
            schema: typeof body === "object" ? body : { message: "string" },
            examples: typeof body === "object" ? [body] : [],
          };
        }
      } else if (line.startsWith("@throws")) {
        // @throws {500} Internal server error
        const match = line.match(/@throws\s+\{(\d+)\}\s*(.*)/);
        if (match) {
          errors.push({ type: "throw", description: match[2] });
          if (!responses[match[1]]) {
            responses[match[1]] = { description: match[2], schema: { error: "string", message: "string" } };
          }
        }
      } else if (line.startsWith("@roles")) {
        // @roles user, developer, admin
        roles = line.slice(6).trim().split(/\s*,\s*/);
      } else if (line.startsWith("@example")) {
        // @example { "email": "user@example.com" }
        const body = line.slice(8).trim();
        try {
          example = JSON.parse(body);
        } catch { /* ignore */ }
      } else if (!line.startsWith("@") && !description) {
        // First non-tag line is the description
        description = line;
      }
    }

    if (description) result.description = description;
    if (Object.keys(params).length > 0) result.requestBody = params;
    if (Object.keys(responses).length > 0) result.responses = responses;
    if (errors.length > 0) result.errors = errors;
    if (roles) result.allowedRoles = roles;

    return Object.keys(result).length > 0 ? result : null;
  }

  getDefaultExample(type) {
    switch (type) {
      case "string": return "example_value";
      case "number": return 123;
      case "boolean": return true;
      case "object": return {};
      case "array": return [];
      default: return "example";
    }
  }

  extractServiceInfo(servicePath) {
    const ast = this.parseFile(servicePath);
    if (!ast) return {};

    const functions = {};
    const self = this;

    traverse(ast, {
      VariableDeclarator(path) {
        if (
          path.node.id.type === "Identifier" &&
          path.node.init &&
          (path.node.init.type === "ArrowFunctionExpression" ||
            path.node.init.type === "FunctionExpression")
        ) {
          const functionName = path.node.id.name;
          const params = self.extractParameters(path.node.init.params);
          const analysis = self.analyzeFunction(path.node.init.body);

          functions[functionName] = {
            params,
            responses: analysis.responses,
            errors: analysis.errors,
          };
        }
      },

      FunctionDeclaration(path) {
        const functionName = path.node.id.name;
        const params = self.extractParameters(path.node.params);
        const analysis = self.analyzeFunction(path.node.body);

        functions[functionName] = {
          params,
          responses: analysis.responses,
          errors: analysis.errors,
        };
      },

      ExportDefaultDeclaration(path) {
        if (path.node.declaration.type === "ObjectExpression") {
          path.node.declaration.properties.forEach((prop) => {
            if (prop.key && prop.key.name) {
              const functionName = prop.key.name;
              
              if (prop.value.type === "ArrowFunctionExpression" ||
                  prop.value.type === "FunctionExpression") {
                const params = self.extractParameters(prop.value.params);
                const analysis = self.analyzeFunction(prop.value.body);
                
                functions[functionName] = { params, responses: analysis.responses, errors: analysis.errors };
              }
            }
          });
        }
      },

      AssignmentExpression(path) {
        if (
          path.node.left.type === "MemberExpression" &&
          path.node.left.object.name === "module" &&
          path.node.left.property.name === "exports" &&
          path.node.right.type === "ObjectExpression"
        ) {
          path.node.right.properties.forEach((prop) => {
            if (prop.key && prop.key.name) {
              const functionName = prop.key.name;
              
              if (prop.value.type === "ArrowFunctionExpression" ||
                  prop.value.type === "FunctionExpression") {
                const params = self.extractParameters(prop.value.params);
                const analysis = self.analyzeFunction(prop.value.body);
                
                functions[functionName] = { params, responses: analysis.responses, errors: analysis.errors };
              }
            }
          });
        }
      },
    });

    return functions;
  }

  analyzeFunction(body) {
    const responses = [];
    const errors = [];

    const analyzeNode = (node, inCatch = false) => {
      if (!node) return;

      if (node.type === "ReturnStatement" && node.argument) {
        if (node.argument.type === "ObjectExpression") {
          const obj = {};
          node.argument.properties.forEach((prop) => {
            if (prop.key && prop.key.name) {
              obj[prop.key.name] = this.inferType(prop.value);
            }
          });
          responses.push({ data: obj, inCatch });
        } else if (node.argument.type === "Identifier") {
          responses.push({ data: { result: node.argument.name }, inCatch });
        }
      }

      if (
        node.type === "CallExpression" &&
        node.callee?.object?.name === "LogModule" &&
        node.callee?.property?.name === "error"
      ) {
        const errorInfo = { type: "LoggedError" };
        if (node.arguments[0]?.type === "ObjectExpression") {
          node.arguments[0].properties.forEach((prop) => {
            if (prop.key?.name === "key1" && prop.value?.value) errorInfo.key1 = prop.value.value;
            if (prop.key?.name === "key2" && prop.value?.value) errorInfo.key2 = prop.value.value;
          });
        }
        errorInfo.description = `Error logged: ${errorInfo.key1 || "unknown"}.${errorInfo.key2 || "error"}`;
        errors.push(errorInfo);
      }

      if (node.type === "CatchClause") {
        errors.push({ type: "catch", description: "General error caught", variable: node.param?.name || "error" });
        if (node.body) analyzeNode(node.body, true);
      }

      if (node.type === "ThrowStatement") {
        let message = "Error thrown";
        if (node.argument?.type === "NewExpression" && node.argument.arguments[0]?.value) {
          message = node.argument.arguments[0].value;
        }
        errors.push({ type: "throw", description: message });
      }
      // do not recursively re-analyze the original body here (would cause infinite recursion)
    };

    if (body) analyzeNode(body);
    return { responses, errors };

  }

  inferType(node) {
    if (!node) return "any";
    switch (node.type) {
      case "StringLiteral": return "string";
      case "NumericLiteral": return "number";
      case "BooleanLiteral": return "boolean";
      case "ArrayExpression": return "array";
      case "ObjectExpression": return "object";
      default: return "any";
    }
  }

  extractParameters(params) {
    const result = {};
    if (!params || !Array.isArray(params)) return result;

    params.forEach((param) => {
      if (param.type === "ObjectPattern" && param.properties) {
        param.properties.forEach((prop) => {
          if (prop.key?.name) {
            result[prop.key.name] = { type: "any", required: true, description: `The ${prop.key.name} parameter` };
          }
        });
      } else if (param.type === "Identifier") {
        result[param.name] = { type: "any", required: true, description: `The ${param.name} parameter` };
      }
    });

    return result;
  }

  extractRoutes(routePath, servicePath) {
    const ast = this.parseFile(routePath);
    if (!ast) return [];

    const routes = [];
    let preHandler = null;
    let serviceFunctions = {};

    // Try main service path or alternative (.js -> ..js)
    let resolvedServicePath = null;
    if (fs.existsSync(servicePath)) {
      resolvedServicePath = servicePath;
      serviceFunctions = this.extractServiceInfo(servicePath);
    } else {
      const altPath = servicePath.replace('.js', '..js');
      if (fs.existsSync(altPath)) {
        resolvedServicePath = altPath;
        serviceFunctions = this.extractServiceInfo(altPath);
      }
    }

    // Parse service AST for JSDoc extraction
    const serviceAst = resolvedServicePath ? this.parseFile(resolvedServicePath) : null;

    const self = this;

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.property?.name === "addHook" && path.node.arguments[0]?.value === "preHandler") {
          preHandler = path.node.arguments[1]?.name || null;
        }

        if (
          path.node.callee.object?.name === "fastify" &&
          ["get", "post", "put", "delete", "patch"].includes(path.node.callee.property?.name)
        ) {
          const method = path.node.callee.property.name.toUpperCase();
          const routePath = path.node.arguments[0]?.value;

          if (routePath) {
            // Support signatures: (path, handler) and (path, options, handler)
            const args = path.node.arguments || [];
            let optionsArg = null;
            let handlerArg = null;
            if (args.length === 2) {
              handlerArg = args[1];
            } else if (args.length >= 3) {
              optionsArg = args[1];
              handlerArg = args[2];
            }

            // detect per-route preHandler option
            let routePreHandler = null;
            if (optionsArg && optionsArg.type === 'ObjectExpression') {
              for (const prop of optionsArg.properties) {
                if (prop.key?.name === 'preHandler') {
                  if (prop.value?.type === 'Identifier') routePreHandler = prop.value.name;
                  else if (prop.value?.type === 'ArrayExpression' && prop.value.elements[0]?.name) routePreHandler = prop.value.elements[0].name;
                }
              }
            }

            const route = { method, path: routePath, requiresAuth: routePreHandler !== null || preHandler !== null, authMiddleware: routePreHandler || preHandler };

            if (handlerArg?.type === "CallExpression" && handlerArg.callee?.name === "wrapper") {
              const serviceCall = handlerArg.arguments[0];
              if (serviceCall?.type === "MemberExpression" && serviceCall.property?.name) {
                const functionName = serviceCall.property.name;
                route.functionName = functionName;
                if (serviceFunctions[functionName]) {
                  route.requestBody = serviceFunctions[functionName].params;
                  route.serviceResponses = serviceFunctions[functionName].responses;
                  route.serviceErrors = serviceFunctions[functionName].errors;
                }
              }
            } else if (handlerArg?.type === "Identifier") {
              route.functionName = handlerArg.name;
              if (serviceFunctions[handlerArg.name]) {
                route.requestBody = serviceFunctions[handlerArg.name].params;
                route.serviceResponses = serviceFunctions[handlerArg.name].responses;
                route.serviceErrors = serviceFunctions[handlerArg.name].errors;
              }
            }

            routes.push(route);
          }
        }
      },
    });

    return { routes, serviceAst };
  }

  mergeEndpointData(autoData, manualData) {
    if (!manualData) return autoData;

    const merged = { ...autoData };
    if (manualData.description) merged.description = manualData.description;
    if (manualData.detailedDescription) merged.detailedDescription = manualData.detailedDescription;
    if (manualData.headers) merged.headers = manualData.headers;
    if (manualData.requestBody) merged.requestBody = manualData.requestBody;
    if (manualData.responses) merged.responses = manualData.responses;
    if (manualData.errors) merged.errors = manualData.errors;
    if (manualData.allowedRoles) merged.allowedRoles = manualData.allowedRoles;

    // Ensure auth header
    // make sure headers array exists so we can safely push/unshift below
    merged.headers = merged.headers || [];

    if (autoData.requiresAuth && !merged.headers.some(h => h.name === "Authorization")) {
      const tokenType = autoData.authMiddleware === "requireUser" ? "userToken" 
        : autoData.authMiddleware === "requireDeveloper" ? "developerToken"
        : autoData.authMiddleware === "requireAdmin" ? "adminToken" : "token";
      
      merged.headers.unshift({
        name: "Authorization",
        value: `Bearer <${tokenType}>`,
        type: "auth_header",
        required: true,
      });
    }

    // Ensure Content-Type
    if (autoData.method !== "GET" && !merged.headers.some(h => h.name === "Content-Type")) {
      merged.headers.push({
        name: "Content-Type",
        value: "application/json",
        type: "content_type",
        required: true,
      });
    }

    return merged;
  }

  getEmoji(routeName, method) {
    const lowerName = routeName.toLowerCase();
    for (const [key, emoji] of Object.entries(this.emojiMap)) {
      if (lowerName.includes(key.toLowerCase())) return emoji;
    }
    return { GET: "📖", POST: "📝", PUT: "✏️", DELETE: "🗑️", PATCH: "🔧" }[method] || "📌";
  }

  toTitle(str) {
    return str.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
  }

  determineRoles(preHandler, routePath) {
    for (const rule of this.roleRules) {
      if (rule.pattern?.test(routePath)) return rule.roles;
      if (rule.middleware && preHandler && rule.middleware.includes(preHandler)) return rule.roles;
      if (rule.default) return rule.roles;
    }
    return ["admin", "developer", "user"];
  }

  scanDirectory(dir, basePath = "") {
    const items = fs.readdirSync(dir);
    const result = [];

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        result.push(...this.scanDirectory(fullPath, path.join(basePath, item)));
      } else if (item.endsWith(".js") && !this.config.parser.excludeFiles.includes(item)) {
        const cleanName = item.replace(/\.+js$/, '');
        result.push({
          routeFile: fullPath,
          serviceFile: path.join(this.serviceDir, basePath, cleanName + ".js"),
          category: basePath.split(path.sep)[0] || "root",
          name: cleanName,
        });
      }
    }

    return result;
  }

  async generateCompleteStructure() {
    console.log("🚀 Starting API structure generation...\n");

    const services = [];
    const endpoints = [];
    const edges = [];
    const groups = new Map();

    for (const [key, config] of Object.entries(this.serviceConfig)) {
      services.push({
        id: config.id,
        title: config.title,
        category: config.category,
        emoji: config.emoji,
        description: config.description,
        detailedDescription: config.detailedDescription || config.description,
        type: "service",
        allowedRoles: config.allowedRoles,
      });
      console.log(`✅ Service: ${config.title}`);
    }

    const routeFiles = this.scanDirectory(this.routeDir);
    console.log(`\n📂 Found ${routeFiles.length} route files\n`);

    let manualCount = 0;

    for (const { routeFile, serviceFile, category, name } of routeFiles) {
      if (this.config.parser.verbose) {
        console.log(`📄 Processing: ${category}/${name}`);
      }

      const { routes, serviceAst } = this.extractRoutes(routeFile, serviceFile);
      const serviceId = this.serviceConfig[category]?.id || "unknown-service";

      const shouldGroup = this.config.parser.autoGroup && routes.length >= this.config.parser.minRoutesForGroup && !this.groupConfig.neverGroup.includes(name);
      const groupId = shouldGroup ? `${name}-group` : null;

      if (groupId && !groups.has(groupId)) {
        const groupTitle = this.groupConfig.customNames[name] || this.toTitle(name);
        const groupEndpoint = {
          id: groupId,
          title: groupTitle,
          category: this.toTitle(category),
          emoji: this.getEmoji(name, "GROUP"),
          description: `${groupTitle} endpoints`,
          detailedDescription: `${groupTitle} management`,
          method: "",
          path: "",
          requiresAuth: false,
          type: "group",
          parentId: serviceId,
          allowedRoles: this.determineRoles(null, `/${category}/${name}`),
        };
        endpoints.push(groupEndpoint);
        groups.set(groupId, groupEndpoint);
        edges.push({ source: serviceId, target: groupId });
      }

      for (const route of routes) {
        const endpointId = `${name}-${route.functionName || route.path.replace(/\//g, "-")}`;
        const fullPath = `/${category}${name !== category ? `/${name}` : ""}${route.path}`;
        const allowedRoles = this.determineRoles(route.authMiddleware, fullPath);

        const manualData = this.getManualData(name, route.functionName, route.path, category);
        const jsDocData = route.functionName && serviceAst ? this.extractJSDoc(serviceAst, route.functionName) : null;

        const baseEndpoint = {
          id: endpointId,
          title: this.toTitle(route.functionName || route.path),
          category: this.toTitle(category),
          emoji: this.getEmoji(route.functionName || route.path, route.method),
          description: `${route.method} ${fullPath}`,
          detailedDescription: `${route.method} /api${fullPath}`,
          method: route.method,
          path: fullPath,
          requiresAuth: route.requiresAuth,
          authMiddleware: route.authMiddleware,
          type: "endpoint",
          parentId: groupId || serviceId,
          allowedRoles,
          requestBody: route.requestBody || {},
          responses: route.serviceResponses ? this.formatResponses(route.serviceResponses, route.serviceErrors) : {},
          errors: route.serviceErrors || [],
          fileName: name,
          functionName: route.functionName,
        };

        // Priority: manual > JSDoc > auto-detected
        const mergedWithJSDoc = this.mergeEndpointData(baseEndpoint, jsDocData);
        const finalEndpoint = this.mergeEndpointData(mergedWithJSDoc, manualData);
        if (manualData) manualCount++;

        endpoints.push(finalEndpoint);
        edges.push({ source: groupId || serviceId, target: endpointId });
      }
    }

    for (const customEdge of this.customEdges) {
      const sourceExists = [...services, ...endpoints].some(i => i.id === customEdge.from);
      const targetExists = [...services, ...endpoints].some(i => i.id === customEdge.to);
      if (sourceExists && targetExists) {
        edges.push({ source: customEdge.from, target: customEdge.to });
      }
    }

    console.log(`\n✅ Generated ${services.length} services`);
    console.log(`✅ Generated ${endpoints.length} endpoints`);
    console.log(`✅ Generated ${edges.length} edges`);
    console.log(`📚 Manual data: ${manualCount}/${endpoints.length} endpoints\n`);

    return { services, endpoints, edges };
  }

  formatResponses(serviceResponses, serviceErrors) {
    const responses = {};
    
    if (serviceResponses?.length > 0) {
      const success = serviceResponses.filter(r => !r.inCatch);
      if (success.length > 0) {
        responses["200"] = {
          description: "Success",
          schema: success[0].data,
          examples: success.map(r => r.data),
        };
      }
    } else {
      responses["200"] = { description: "Success", schema: { success: "boolean", message: "string" } };
    }

    if (serviceErrors?.length > 0) {
      responses["400"] = { description: "Bad Request", schema: { error: "string", message: "string" } };
      responses["500"] = { description: "Internal Server Error", schema: { error: "string", message: "string" } };
    }

    return responses;
  }

  /**
   * Convert internal structure to OpenAPI 3.0 spec
   */
  generateOpenAPISpec(backendData, config) {
    const spec = {
      openapi: "3.0.3",
      info: {
        title: config.title || "API Documentation",
        description: config.description || "Auto-generated API documentation",
        version: config.version || "1.0.0",
      },
      servers: (config.servers || []).map(s => ({ url: s.url, description: s.description })),
      tags: backendData.services.map(s => ({
        name: s.title,
        description: s.description,
      })),
      paths: {},
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    };

    // Build paths from endpoints
    for (const endpoint of backendData.endpoints) {
      if (endpoint.type !== "endpoint" || !endpoint.method || !endpoint.path) continue;

      const apiPath = `/api${endpoint.path}`;
      const method = endpoint.method.toLowerCase();

      if (!spec.paths[apiPath]) spec.paths[apiPath] = {};

      const operation = {
        operationId: endpoint.id,
        summary: endpoint.title,
        description: endpoint.description,
        tags: [this.findServiceTitle(backendData.services, endpoint)],
      };

      // Security
      if (endpoint.requiresAuth) {
        operation.security = [{ BearerAuth: [] }];
      }

      // Request body
      if (endpoint.requestBody && Object.keys(endpoint.requestBody).length > 0 && method !== "get") {
        const properties = {};
        const required = [];

        for (const [key, val] of Object.entries(endpoint.requestBody)) {
          const fieldType = typeof val === "object" ? (val.type || "string") : String(val);
          properties[key] = {
            type: fieldType,
            description: typeof val === "object" ? (val.description || "") : `The ${key} parameter`,
          };
          if (typeof val === "object" && val.example !== undefined) {
            properties[key].example = val.example;
          }
          if (typeof val === "object" ? val.required !== false : true) {
            required.push(key);
          }
        }

        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties,
                ...(required.length > 0 ? { required } : {}),
              },
            },
          },
        };
      }

      // Responses
      operation.responses = {};
      if (endpoint.responses && Object.keys(endpoint.responses).length > 0) {
        for (const [status, data] of Object.entries(endpoint.responses)) {
          operation.responses[status] = {
            description: data.description || "Response",
          };
          if (data.schema) {
            operation.responses[status].content = {
              "application/json": {
                schema: this.schemaToOpenAPI(data.schema),
                ...(data.examples?.length ? { example: data.examples[0] } : {}),
              },
            };
          }
        }
      } else {
        operation.responses["200"] = { description: "Success" };
      }

      spec.paths[apiPath][method] = operation;
    }

    return spec;
  }

  findServiceTitle(services, endpoint) {
    const service = services.find(s => s.id === endpoint.parentId);
    if (service) return service.title;
    // Check if parent is a group, find its parent service
    return endpoint.category || "API";
  }

  schemaToOpenAPI(schema) {
    if (!schema || typeof schema !== "object") return { type: "object" };

    const properties = {};
    for (const [key, val] of Object.entries(schema)) {
      if (typeof val === "string") {
        properties[key] = { type: val === "boolean" ? "boolean" : val === "number" ? "number" : "string" };
      } else if (typeof val === "object") {
        properties[key] = { type: "object" };
      } else {
        properties[key] = { type: "string" };
      }
    }

    return { type: "object", properties };
  }

  async generate() {
    const structure = await this.generateCompleteStructure();

    const libDir = path.dirname(this.outputFile);
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    // Add meta with hash for staleness detection
    const structureJSON = JSON.stringify(structure);
    const hash = crypto.createHash("sha256").update(structureJSON).digest("hex").slice(0, 16);

    const backendData = {
      meta: {
        generatedAt: new Date().toISOString(),
        hash,
        version: "1.0.0",
        endpointCount: structure.endpoints.length,
        serviceCount: structure.services.length,
      },
      ...structure,
    };

    const outputContent = `// Auto-generated by API Parser
// DO NOT EDIT MANUALLY
// Generated: ${backendData.meta.generatedAt}
// Hash: ${hash}

export const backendData = ${JSON.stringify(backendData, null, 2)};
`;

    fs.writeFileSync(this.outputFile, outputContent);
    console.log(`💾 Saved to: ${this.outputFile}`);
    console.log(`🔑 Hash: ${hash}`);

    // Generate OpenAPI spec if configured
    const openApiConfig = this.config.openapi;
    if (openApiConfig) {
      const spec = this.generateOpenAPISpec(backendData, openApiConfig);
      const specPath = path.join(libDir, "openapi-spec.json");
      fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
      console.log(`📄 OpenAPI spec saved to: ${specPath}`);
    }

    console.log(`\n🎉 Complete!\n`);

    return backendData;
  }
}

if (require.main === module) {
  const parser = new ApiParser();
  parser.generate().catch(console.error);
}

module.exports = ApiParser;