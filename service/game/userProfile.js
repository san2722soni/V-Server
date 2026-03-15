import UserProfile from "../../model/UserProfile.js";
import LogModule from "../../service/log/index.js";
import CharacterService from "../entity/character.js";

async function getProfile({ userData }) {
  try {
    LogModule.log({
      key1: "get_profile",
      key2: "start",
      text1: "Fetching user profile",
      text2: `User ID: ${userData.userId}`,
    });

    const profile = await UserProfile.findOne({ userId: userData.userId });

    if (!profile) throw new Error("Profile not found");

    LogModule.log({
      key1: "get_profile",
      key2: "success",
      text1: "User profile fetched successfully",
      text2: `User ID: ${userData.userId}`,
    });

    return { profile };
  } catch (error) {
    LogModule.error({
      key1: "get_profile",
      key2: "failed",
      text1: "Failed to fetch user profile",
      text2: `User ID: ${userData.userId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function updateName({ name, userData }) {
  try {
    LogModule.log({
      key1: "update_name",
      key2: "start",
      text1: "Updating user name",
      text2: `User ID: ${userData.userId}, Name: ${name}`,
    });

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("Please provide a valid name");
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId: userData.userId },
      { name: name.trim() }
    );

    if (!profile) throw new Error("Profile not found");

    LogModule.log({
      key1: "update_name",
      key2: "success",
      text1: "User name updated successfully",
      text2: `User ID: ${userData.userId}, Name: ${name}`,
    });

    return { message: "Name updated successfully", profile };
  } catch (error) {
    LogModule.error({
      key1: "update_name",
      key2: "failed",
      text1: "Failed to update user name",
      text2: `User ID: ${userData.userId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function getProfiles({ userIds }) {
  try {
    LogModule.log({
      key1: "get_profiles",
      key2: "start",
      text1: "Fetching profiles by user IDs",
      text2: `Count: ${userIds?.length}`,
    });

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("Please provide a valid array of user IDs");
    }

    const profiles = await UserProfile.find({ userId: { $in: userIds } });

    LogModule.log({
      key1: "get_profiles",
      key2: "success",
      text1: "Profiles fetched successfully",
      text2: `Requested: ${userIds.length}, Found: ${profiles.length}`,
    });

    return { profiles };
  } catch (error) {
    LogModule.error({
      key1: "get_profiles",
      key2: "failed",
      text1: "Failed to fetch profiles",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function createProfile({ userId }) {
  try {
    LogModule.log({
      key1: "create_profile",
      key2: "start",
      text1: "Creating user profile",
      text2: `User ID: ${userId}`,
    });

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check if profile already exists
    const existingProfile = await UserProfile.findOne({ userId });
    if (existingProfile) {
      LogModule.log({
        key1: "create_profile",
        key2: "exists",
        text1: "Profile already exists",
        text2: `User ID: ${userId}`,
      });
      return { profile: existingProfile };
    }

    // Get all active characters
    const activeCharacters = await CharacterService.getAllCharacters({ isActive: true });

    if (!activeCharacters || activeCharacters.length === 0) {
      throw new Error("No active characters available");
    }

    // Pick random active character
    const randomCharacter = activeCharacters[Math.floor(Math.random() * activeCharacters.length)];

    // Generate random 4-digit player name
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const playerName = `Player_${randomDigits}`;

    // Create profile
    const profile = await UserProfile.create({
      userId,
      characterId: randomCharacter._id,
      name: playerName,
    });

    LogModule.log({
      key1: "create_profile",
      key2: "success",
      text1: "User profile created successfully",
      text2: `User ID: ${userId}, Name: ${playerName}, Character: ${randomCharacter.name}`,
    });

    return { profile };
  } catch (error) {
    LogModule.error({
      key1: "create_profile",
      key2: "failed",
      text1: "Failed to create user profile",
      text2: `User ID: ${userId}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export default {
  getProfile,
  getProfiles,
  updateName,
  createProfile,
};
