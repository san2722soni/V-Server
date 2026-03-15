import mongoose from "mongoose";
import LogModule from "../../service/log/index.js";

const runQuery = async ({ text }) => {
  try {
    LogModule.log({
      key1: "runQuery",
      key2: "start",
      text1: "Database query execution started",
      text2: `Query: ${text?.substring(0, 50)}...`,
    });

    if (!text) return { success: false, message: "Query text required" };

    const db = mongoose.connection.db;

    // ONLY BLOCK EXTREMELY DANGEROUS OPERATIONS
    const blockedOperations = ["dropDatabase", "eval", "shutdown"];

    // Check if query contains any blocked operations
    const hasBlockedOp = blockedOperations.some((op) => text.includes(op));
    if (hasBlockedOp) {
      LogModule.error({
        key1: "runQuery",
        key2: "blocked",
        text1: "Dangerous query blocked",
        text2: `Query contained blocked operation`,
        error: "Blocked operation detected",
      });
      return { success: false, message: "❌ This operation is not allowed" };
    }

    console.log("Executing query:", text);

    // AUTO-ADD toArray() to find() queries that don't have terminal operations
    let finalQuery = text.trim();
    const hasTerminalOperation =
      text.includes(".toArray()") ||
      text.includes(".count()") ||
      text.includes(".limit(") ||
      text.includes(".sort(") ||
      text.includes(".skip(") ||
      text.includes(".forEach(") ||
      text.includes(".next(");

    if (text.includes(".find(") && !hasTerminalOperation) {
      finalQuery = text + ".toArray()";
      console.log("Auto-added toArray():", finalQuery);
    }

    // Execute the query
    const result = await new Function(
      "db",
      `
      "use strict";
      return (async () => {
        try {
          return await ${finalQuery};
        } catch(err) {
          throw new Error("Query execution failed: " + err.message);
        }
      })();
    `
    )(db);

    LogModule.log({
      key1: "runQuery",
      key2: "success",
      text1: "Query executed successfully",
      text2: `Result count: ${
        Array.isArray(result) ? result.length : "single"
      }`,
    });

    return { success: true, data: result };
  } catch (err) {
    LogModule.error({
      key1: "runQuery",
      key2: "failed",
      text1: "Query execution failed",
      text2: `Query: ${text?.substring(0, 50)}...`,
      error: err.message,
      stack: err.stack,
    });
    return { success: false, message: err.message };
  }
};

export default { runQuery };
