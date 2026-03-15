// scripts/api-parser.cjs
const fs = require("fs");
const path = require("path");
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
    if (fs.existsSync(servicePath)) {
      serviceFunctions = this.extractServiceInfo(servicePath);
    } else {
      const altPath = servicePath.replace('.js', '..js');
      if (fs.existsSync(altPath)) {
        serviceFunctions = this.extractServiceInfo(altPath);
      }
    }

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

    return routes;
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

      const routes = this.extractRoutes(routeFile, serviceFile);
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

        const finalEndpoint = this.mergeEndpointData(baseEndpoint, manualData);
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

  async generate() {
    const backendData = await this.generateCompleteStructure();

    const libDir = path.dirname(this.outputFile);
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    const outputContent = `// Auto-generated by API Parser
// DO NOT EDIT MANUALLY
// Generated: ${new Date().toISOString()}

export const backendData = ${JSON.stringify(backendData, null, 2)};
`;

    fs.writeFileSync(this.outputFile, outputContent);
    console.log(`💾 Saved to: ${this.outputFile}`);
    console.log(`\n🎉 Complete!\n`);

    return backendData;
  }
}

if (require.main === module) {
  const parser = new ApiParser();
  parser.generate().catch(console.error);
}

module.exports = ApiParser;