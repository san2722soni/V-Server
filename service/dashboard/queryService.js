import Query from "../../model/Query.js";
import LogModule from "../log/index.js";
import mongoose from "mongoose";
import redis from "../../db/redis.js";

// Allowed Redis read-only commands
const ALLOWED_REDIS_COMMANDS = [
  "GET", "MGET", "HGET", "HGETALL", "HMGET",
  "KEYS", "SCAN", "SMEMBERS", "SISMEMBER",
  "LRANGE", "LLEN", "TTL", "PTTL",
  "TYPE", "EXISTS", "DBSIZE", "INFO", "SCARD",
];

const createQuery = async (data) => {
  try {
    const { userData, type, queryString, description } = data;

    LogModule.log({
      key1: "createQuery",
      key2: "start",
      text1: "Query creation started",
      text2: `Type: ${type}, Creator: ${userData?.email}`,
    });

    if (!type || !["mongo", "redis"].includes(type)) {
      throw new Error("Type must be 'mongo' or 'redis'");
    }
    if (!queryString) {
      throw new Error("Query string is required");
    }

    // Validate the query string is valid JSON
    try {
      JSON.parse(queryString);
    } catch {
      throw new Error("Query string must be valid JSON");
    }

    const newQuery = await Query.create({
      creator: {
        developerId: userData.developerId,
        email: userData.email,
      },
      type,
      queryString,
      description: description || "",
    });

    LogModule.log({
      key1: "createQuery",
      key2: "success",
      text1: "Query created successfully",
      text2: `Query ID: ${newQuery._id}`,
    });

    return {
      success: true,
      message: "Query created successfully",
      data: newQuery,
    };
  } catch (error) {
    LogModule.error({
      key1: "createQuery",
      key2: "failed",
      text1: "Query creation failed",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getQueries = async (data) => {
  try {
    const { type } = data;

    LogModule.log({
      key1: "getQueries",
      key2: "start",
      text1: "Fetching queries",
      text2: `Type filter: ${type || "all"}`,
    });

    const filter = {};
    if (type && ["mongo", "redis"].includes(type)) {
      filter.type = type;
    }

    const queries = await Query.find(filter);

    // Sort by createdAt descending
    const sorted = queries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    LogModule.log({
      key1: "getQueries",
      key2: "success",
      text1: "Queries fetched successfully",
      text2: `Count: ${sorted.length}`,
    });

    return {
      success: true,
      data: sorted,
      count: sorted.length,
    };
  } catch (error) {
    LogModule.error({
      key1: "getQueries",
      key2: "failed",
      text1: "Failed to fetch queries",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const updateQuery = async (data) => {
  try {
    const { id, queryString, description, userData } = data;

    LogModule.log({
      key1: "updateQuery",
      key2: "start",
      text1: "Updating query",
      text2: `Query ID: ${id}`,
    });

    if (!id) throw new Error("Query ID is required");

    const existingQuery = await Query.findById(id);
    if (!existingQuery) throw new Error("Query not found");

    // Check ownership: only creator or admin can update
    const isCreator = existingQuery.creator.developerId.toString() === userData.developerId;
    const isAdmin = userData.isAdmin;
    if (!isCreator && !isAdmin) {
      throw new Error("You can only edit your own queries");
    }

    const updateData = {};
    if (queryString !== undefined) {
      // Validate JSON
      try {
        JSON.parse(queryString);
      } catch {
        throw new Error("Query string must be valid JSON");
      }
      updateData.queryString = queryString;
      // Reset approval if query changed
      if (queryString !== existingQuery.queryString) {
        updateData.status = "pending";
        updateData.approvedBy = null;
      }
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const updatedQuery = await Query.findByIdAndUpdate(id, updateData);

    LogModule.log({
      key1: "updateQuery",
      key2: "success",
      text1: "Query updated successfully",
      text2: `Query ID: ${id}`,
    });

    return {
      success: true,
      message: "Query updated successfully",
      data: updatedQuery,
    };
  } catch (error) {
    LogModule.error({
      key1: "updateQuery",
      key2: "failed",
      text1: "Failed to update query",
      text2: `Query ID: ${data.id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteQuery = async (data) => {
  try {
    const { id, userData } = data;

    LogModule.log({
      key1: "deleteQuery",
      key2: "start",
      text1: "Deleting query",
      text2: `Query ID: ${id}`,
    });

    if (!id) throw new Error("Query ID is required");

    const existingQuery = await Query.findById(id);
    if (!existingQuery) throw new Error("Query not found");

    // Check ownership: only creator or admin can delete
    const isCreator = existingQuery.creator.developerId.toString() === userData.developerId;
    const isAdmin = userData.isAdmin;
    if (!isCreator && !isAdmin) {
      throw new Error("You can only delete your own queries");
    }

    await Query.findByIdAndDelete(id);

    LogModule.log({
      key1: "deleteQuery",
      key2: "success",
      text1: "Query deleted successfully",
      text2: `Query ID: ${id}`,
    });

    return {
      success: true,
      message: "Query deleted successfully",
      data: { id },
    };
  } catch (error) {
    LogModule.error({
      key1: "deleteQuery",
      key2: "failed",
      text1: "Failed to delete query",
      text2: `Query ID: ${data.id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const approveQuery = async (data) => {
  try {
    const { id, status, userData } = data;

    LogModule.log({
      key1: "approveQuery",
      key2: "start",
      text1: "Approving/rejecting query",
      text2: `Query ID: ${id}, Status: ${status}`,
    });

    if (!id) throw new Error("Query ID is required");
    if (!status || !["approved", "rejected"].includes(status)) {
      throw new Error("Status must be 'approved' or 'rejected'");
    }

    const existingQuery = await Query.findById(id);
    if (!existingQuery) throw new Error("Query not found");

    if (existingQuery.status !== "pending") {
      throw new Error("Only pending queries can be approved or rejected");
    }

    const updatedQuery = await Query.findByIdAndUpdate(id, {
      status,
      approvedBy: {
        developerId: userData.developerId,
        email: userData.email,
      },
    });

    LogModule.log({
      key1: "approveQuery",
      key2: "success",
      text1: `Query ${status} successfully`,
      text2: `Query ID: ${id}`,
    });

    return {
      success: true,
      message: `Query ${status} successfully`,
      data: updatedQuery,
    };
  } catch (error) {
    LogModule.error({
      key1: "approveQuery",
      key2: "failed",
      text1: "Failed to approve/reject query",
      text2: `Query ID: ${data.id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const executeQuery = async (data) => {
  try {
    const { id, userData, params } = data;

    LogModule.log({
      key1: "executeQuery",
      key2: "start",
      text1: "Executing query",
      text2: `Query ID: ${id}`,
    });

    if (!id) throw new Error("Query ID is required");

    const query = await Query.findById(id);
    if (!query) throw new Error("Query not found");

    if (query.status !== "approved") {
      throw new Error("Only approved queries can be executed");
    }

    const parsed = JSON.parse(query.queryString);
    const runtimeParams = Array.isArray(params) ? params : [];
    let result;

    if (query.type === "mongo") {
      result = await executeMongoQuery(parsed, runtimeParams);
    } else if (query.type === "redis") {
      result = await executeRedisQuery(parsed, runtimeParams);
    }

    // Save result back to the query
    await Query.findByIdAndUpdate(id, {
      result,
      executedAt: new Date(),
    });

    LogModule.log({
      key1: "executeQuery",
      key2: "success",
      text1: "Query executed successfully",
      text2: `Query ID: ${id}, Type: ${query.type}`,
    });

    return {
      success: true,
      message: "Query executed successfully",
      data: result,
    };
  } catch (error) {
    LogModule.error({
      key1: "executeQuery",
      key2: "failed",
      text1: "Failed to execute query",
      text2: `Query ID: ${data.id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// ---- Chain Command Parser ----

/**
 * Replace <<$>> placeholders with actual param values.
 * - "<<$>>" (inside quotes) → raw param value (keeps surrounding quotes)
 * - <<$>> (bare) → JSON.stringify(param) (auto-adds quotes for strings)
 */
const replacePlaceholders = (chain, params) => {
  let paramIndex = 0;
  let result = chain;

  // First pass: replace "<<$>>" (quoted placeholders) with raw value
  result = result.replace(/"<<\$>>"/g, () => {
    if (paramIndex >= params.length) throw new Error("Not enough parameters for placeholders");
    const val = params[paramIndex++];
    return JSON.stringify(val);
  });

  // Second pass: replace bare <<$>> with JSON-stringified value
  result = result.replace(/<<\$>>/g, () => {
    if (paramIndex >= params.length) throw new Error("Not enough parameters for placeholders");
    const val = params[paramIndex++];
    return JSON.stringify(val);
  });

  return result;
};

/**
 * Fix JS-style unquoted keys to valid JSON.
 * Converts {name: "value"} → {"name": "value"}
 */
const fixUnquotedKeys = (str) => {
  // Match keys that are not already quoted, at the start of object or after comma
  return str.replace(/([{,])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
};

/**
 * Parse a chain command string into an array of { method, args } objects.
 * Input: .find({"email": "test"}).sort({"name": 1}).limit(10)
 * Output: [{ method: "find", args: [{"email": "test"}] }, { method: "sort", args: [{"name": 1}] }, { method: "limit", args: [10] }]
 */
const parseChain = (chainStr) => {
  const chain = chainStr.trim();
  const methods = [];
  let i = chain.startsWith(".") ? 1 : 0;

  while (i < chain.length) {
    // Find method name (up to opening paren)
    const parenStart = chain.indexOf("(", i);
    if (parenStart === -1) break;

    const methodName = chain.substring(i, parenStart).trim();

    // Find matching closing paren
    let depth = 1;
    let j = parenStart + 1;
    let inString = false;
    let stringChar = "";
    let escaped = false;

    while (j < chain.length && depth > 0) {
      const ch = chain[j];

      if (escaped) {
        escaped = false;
        j++;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        j++;
        continue;
      }

      if (inString) {
        if (ch === stringChar) {
          inString = false;
        }
      } else {
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
        } else if (ch === "(") {
          depth++;
        } else if (ch === ")") {
          depth--;
        }
      }

      j++;
    }

    const argsStr = chain.substring(parenStart + 1, j - 1).trim();

    // Parse arguments
    let args = [];
    if (argsStr.length > 0) {
      // Wrap in array for JSON parsing: "arg1, arg2" → "[arg1, arg2]"
      const fixedArgs = fixUnquotedKeys(argsStr);
      try {
        args = JSON.parse(`[${fixedArgs}]`);
      } catch {
        // Try parsing as a single value
        try {
          args = [JSON.parse(fixUnquotedKeys(argsStr))];
        } catch {
          throw new Error(`Failed to parse arguments for .${methodName}(): ${argsStr}`);
        }
      }
    }

    methods.push({ method: methodName, args });

    // Move past the closing paren and the next dot
    i = j;
    if (i < chain.length && chain[i] === ".") {
      i++;
    }
  }

  return methods;
};

// ---- Execution helpers ----

// Methods that return cursors (need .toArray())
const CURSOR_METHODS = ["find", "aggregate"];
// Methods that modify cursors
const CURSOR_MODIFIERS = ["sort", "limit", "skip", "project", "maxTimeMS"];

const executeMongoQuery = async (parsed, runtimeParams = []) => {
  // Support both new simple format { command: "col.find({})..." } and legacy { collection, chain, params }
  let collection, chain, params;

  if (parsed.command) {
    // New format: "developers.find({}).limit(5)"
    const cmd = parsed.command.trim();
    const dotIndex = cmd.indexOf(".");
    if (dotIndex === -1) throw new Error("MongoDB command must be in format: collection.method(args)...");
    collection = cmd.substring(0, dotIndex);
    chain = cmd.substring(dotIndex);
    params = runtimeParams.length > 0 ? runtimeParams : [];
  } else {
    ({ collection, chain } = parsed);
    params = runtimeParams.length > 0 ? runtimeParams : (parsed.params || []);
  }

  if (!collection) throw new Error("Collection name is required");
  if (!chain) throw new Error("Chain command is required");

  // Replace placeholders with params
  const resolvedChain = params && params.length > 0
    ? replacePlaceholders(chain, params)
    : chain;

  // Parse the chain into method calls
  const methods = parseChain(resolvedChain);

  if (methods.length === 0) {
    throw new Error("No method calls found in chain");
  }

  const db = mongoose.connection.db;
  const col = db.collection(collection);

  // Execute the chain
  let cursor = col;
  let isCursor = false;

  for (const { method, args } of methods) {
    if (typeof cursor[method] !== "function") {
      throw new Error(`Method '${method}' is not available on ${isCursor ? "cursor" : "collection"}`);
    }

    cursor = cursor[method](...args);

    if (CURSOR_METHODS.includes(method)) {
      isCursor = true;
    }
  }

  // If cursor has toArray, call it to get results
  if (cursor && typeof cursor.toArray === "function") {
    return await cursor.toArray();
  }

  // Otherwise await the result directly
  return await cursor;
};

const executeRedisQuery = async (parsed, runtimeParams = []) => {
  // Support both new simple format { command: "GET <<$>>" } and legacy { command, args }
  let command, args;

  if (parsed.command) {
    // Replace <<$>> placeholders with runtime params
    let resolvedCmd = parsed.command.trim();
    if (runtimeParams.length > 0) {
      let idx = 0;
      resolvedCmd = resolvedCmd.replace(/<<\$>>/g, () => runtimeParams[idx++] ?? "");
    }
    const parts = resolvedCmd.split(/\s+/);
    command = parts[0];
    args = parts.slice(1);
  } else {
    command = parsed.command;
    args = parsed.args;
  }

  if (!command) throw new Error("Redis command is required");

  const upperCommand = command.toUpperCase();

  if (!ALLOWED_REDIS_COMMANDS.includes(upperCommand)) {
    throw new Error(
      `Command '${command}' is not allowed. Allowed: ${ALLOWED_REDIS_COMMANDS.join(", ")}`
    );
  }

  const redisClient = redis.client;

  if (!redisClient.isOpen) {
    throw new Error("Redis client is not connected");
  }

  const cmdArgs = Array.isArray(args) ? args : [];

  const result = await redisClient.sendCommand([upperCommand, ...cmdArgs.map(String)]);

  return result;
};

export default {
  createQuery,
  getQueries,
  updateQuery,
  deleteQuery,
  approveQuery,
  executeQuery,
};
