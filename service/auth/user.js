import User from "../../model/User.js";
import Otp from "../../model/UserOtp.js";
import LogModule from "../../service/log/index.js";
import WhitelistedUserService from "../dashboard/whitelistedUser.js";
import UserProfileService from "../game/userProfile.js";

import { REFRESH_TOKEN_EXPIRE_TIME } from "../../constants/index.js";
import {
  generateAccessToken,
  generateOtp,
  generateRefreshToken,
} from "./utils.js";

const login = async (data) => {
  const { email } = data;

  try {
    LogModule.log({
      key1: "login",
      key2: "login_start",
      text1: "Login process started",
      text2: `Email: ${email}`
    });

    // In production, only whitelisted users can login
    if (process.env.NODE_ENV === "production") {
      const allowed = await WhitelistedUserService.isWhitelisted(email);
      if (!allowed) {
        throw new Error("Access denied. This email is not whitelisted for production.");
      }
    }

    const OTP = generateOtp();
    await Otp.deleteOne({ email });
    await Otp.create({ email, value: OTP });

    LogModule.log({
      key1: "login", 
      key2: "login_success",
      text1: "OTP sent successfully",
      text2: `Email: ${email}`
    });
      // return {OTP}
    return { success: true, message: "OTP sent successfully" };
    
  } catch (error) {
    LogModule.error({
      key1: "login",
      key2: "login_failed",
      text1: "Login process failed",
      text2: `Email: ${email}`,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const verifyOtp = async (data) => {
  const { otp, email } = data;
  
  try {
    LogModule.log({
      key1: "verifyOtp",
      key2: "verify_start", 
      text1: "OTP verification started",
      text2: `Email: ${email}`
    });

    const otpObject = await Otp.findOne({ email });

    const isProduction = process.env.NODE_ENV === "production";
    const bypassOtp = !isProduction && otp === "1247";

    if (!bypassOtp && (!otpObject || otp !== otpObject.value)) {
      LogModule.error({
        key1: "verifyOtp",
        key2: "invalid_otp",
        text1: "Invalid OTP provided",
        text2: `Email: ${email}`,
        error: "OTP validation failed",
      });
      throw new Error("Invalid email or otp");
    }

    await Otp.deleteOne({ email });
    const user = await User.findOne({ email });

    let refreshToken = generateRefreshToken();
    const tokenEAT = Date.now() + REFRESH_TOKEN_EXPIRE_TIME;

    let userId;
    let accessToken;

    if (!user) {
      const newUser = await User.create({ email, refreshToken, tokenEAT, isUser: true });
      userId = newUser._id;

      // Auto-create user profile with random player name and character
      try {
        await UserProfileService.createProfile({ userId: newUser._id });
        await User.findByIdAndUpdate(newUser._id, { profileComplete: true });
        LogModule.log({
          key1: "verifyOtp",
          key2: "profile_created",
          text1: "Auto-created user profile",
          text2: `User ID: ${userId}`,
        });
      } catch (profileError) {
        LogModule.error({
          key1: "verifyOtp",
          key2: "profile_creation_failed",
          text1: "Failed to auto-create user profile",
          text2: `User ID: ${userId}`,
          error: profileError.message,
          stack: profileError.stack,
        });
        // Continue with login even if profile creation fails
      }

      accessToken = generateAccessToken({ userId: newUser._id, isUser: true });
    } else {
      userId = user._id;
      if (!user.refreshToken || user.tokenEAT <= Date.now()) {
        await User.findByIdAndUpdate(userId, { refreshToken, tokenEAT, isUser: true });
      } else {
        refreshToken = user.refreshToken;
      }
      accessToken = generateAccessToken({ userId: user._id, isUser: true });
    }

    LogModule.log({
      key1: "verifyOtp",
      key2: "verify_success",
      text1: "OTP verification successful", 
      text2: `User ID: ${userId}`
    });

    return { refreshToken, accessToken };
    
  } catch (error) {
    LogModule.error({
      key1: "verifyOtp",
      key2: "verify_failed",
      text1: "OTP verification failed",
      text2: `Email: ${email}`,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export default {
  login,
  verifyOtp,
};