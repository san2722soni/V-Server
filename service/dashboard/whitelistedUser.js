import WhitelistedUser from "../../model/WhitelistedUser.js";
import LogModule from "../../service/log/index.js";

const addWhitelistedUser = async (data) => {
  const { email } = data;

  try {
    LogModule.log({
      key1: "addWhitelistedUser",
      key2: "start",
      text1: "Adding whitelisted user",
      text2: `Email: ${email}`,
    });

    if (!email) throw new Error("Email is required");

    const existing = await WhitelistedUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error("This email is already whitelisted");
    }

    const whitelistedUser = await WhitelistedUser.create({ email: email.toLowerCase() });

    LogModule.log({
      key1: "addWhitelistedUser",
      key2: "success",
      text1: "Whitelisted user added",
      text2: `Email: ${email}`,
    });

    return {
      success: true,
      message: "Email whitelisted successfully",
      data: whitelistedUser,
    };
  } catch (error) {
    LogModule.error({
      key1: "addWhitelistedUser",
      key2: "failed",
      text1: "Failed to add whitelisted user",
      text2: `Email: ${email}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getWhitelistedUsers = async (data) => {
  try {
    LogModule.log({
      key1: "getWhitelistedUsers",
      key2: "start",
      text1: "Fetching all whitelisted users",
    });

    const users = await WhitelistedUser.find({});

    LogModule.log({
      key1: "getWhitelistedUsers",
      key2: "success",
      text1: "Whitelisted users fetched",
      text2: `Count: ${users.length}`,
    });

    return {
      success: true,
      data: users,
      count: users.length,
    };
  } catch (error) {
    LogModule.error({
      key1: "getWhitelistedUsers",
      key2: "failed",
      text1: "Failed to fetch whitelisted users",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteWhitelistedUser = async (data) => {
  const { id } = data;

  try {
    LogModule.log({
      key1: "deleteWhitelistedUser",
      key2: "start",
      text1: "Deleting whitelisted user",
      text2: `ID: ${id}`,
    });

    if (!id) throw new Error("ID is required");

    const deleted = await WhitelistedUser.findByIdAndDelete(id);

    if (!deleted) {
      throw new Error("Whitelisted user not found");
    }

    LogModule.log({
      key1: "deleteWhitelistedUser",
      key2: "success",
      text1: "Whitelisted user deleted",
      text2: `Email: ${deleted.email}`,
    });

    return {
      success: true,
      message: "Whitelisted user removed",
      data: { id: deleted._id, email: deleted.email },
    };
  } catch (error) {
    LogModule.error({
      key1: "deleteWhitelistedUser",
      key2: "failed",
      text1: "Failed to delete whitelisted user",
      text2: `ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const searchWhitelistedUsers = async (data) => {
  const { query } = data;

  try {
    LogModule.log({
      key1: "searchWhitelistedUsers",
      key2: "start",
      text1: "Searching whitelisted users",
      text2: `Query: ${query}`,
    });

    if (!query) {
      return getWhitelistedUsers(data);
    }

    const users = await WhitelistedUser.find({
      email: { $regex: query, $options: "i" },
    });

    LogModule.log({
      key1: "searchWhitelistedUsers",
      key2: "success",
      text1: "Search completed",
      text2: `Results: ${users.length}`,
    });

    return {
      success: true,
      data: users,
      count: users.length,
    };
  } catch (error) {
    LogModule.error({
      key1: "searchWhitelistedUsers",
      key2: "failed",
      text1: "Failed to search whitelisted users",
      text2: `Query: ${query}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const isWhitelisted = async (email) => {
  try {
    const user = await WhitelistedUser.findOne({ email: email.toLowerCase() });
    return !!user;
  } catch (error) {
    LogModule.error({
      key1: "isWhitelisted",
      key2: "failed",
      text1: "Whitelist check failed",
      text2: `Email: ${email}`,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

export default {
  addWhitelistedUser,
  getWhitelistedUsers,
  deleteWhitelistedUser,
  searchWhitelistedUsers,
  isWhitelisted,
};
