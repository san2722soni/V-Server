import mongoose from "mongoose";
import Character from "../../model/Character.js";
import UserProfile from "../../model/UserProfile.js";
import LogModule from "../../service/log/index.js";

async function choose({ id, userData }) {
  try {
    LogModule.log({
      key1: "choose_character",
      key2: "start",
      text1: "Character selection started",
      text2: `User ID: ${userData.userId}, Character ID: ${id}`,
    });

    if (!id) throw new Error("Please provide a character id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Please provide a valid character id");
    }

    // check if character exist in character collection
    const character = await Character.findOne({ _id: id });
    if (!character) throw new Error("Character with this id does not exist");

    // check if user already has a profile
    let userProfile = await UserProfile.findOne({ userId: userData.userId });

    if (userProfile) {
      if (userProfile.characterId.toString() === id) {
        LogModule.log({
          key1: "choose_character",
          key2: "already_selected",
          text1: "Character already selected",
          text2: `User ID: ${userData.userId}, Character ID: ${id}`,
        });
        return {
          message: "Character already selected",
          userProfile,
        };
      } else {
        // update user with new character
        userProfile.characterId = id;
        await userProfile.save();
        LogModule.log({
          key1: "choose_character",
          key2: "updated",
          text1: "Character updated successfully",
          text2: `User ID: ${userData.userId}, Character ID: ${id}`,
        });
        return {
          message: "Character updated successfully!",
          userProfile,
        };
      }
    } else {
      // create new user profile for this new user
      userProfile = await UserProfile.create({
        userId: userData.userId,
        characterId: id,
      });

      LogModule.log({
        key1: "choose_character",
        key2: "created",
        text1: "Character selected successfully",
        text2: `User ID: ${userData.userId}, Character ID: ${id}`,
      });

      return {
        message: "Character selected successfully!",
        userProfile,
      };
    }
  } catch (error) {
    LogModule.error({
      key1: "choose_character",
      key2: "failed",
      text1: "Character selection failed",
      text2: `User ID: ${userData.userId}, Character ID: ${id}`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export default {
  choose,
};
