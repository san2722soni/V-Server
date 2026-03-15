// import Developer from "../../model/Developer.js";
// import DeveloperOtp from "../../model/DeveloperOtp.js";
// import LogModule from "../../service/log/index.js";

// import { generateAccessToken, generateOtp, generateRefreshToken } from "./utils.js";
// import { REFRESH_TOKEN_EXPIRE_TIME } from "../../constants/index.js";

// const login = async (data) => {
//   const { email } = data;
  
//   try {
//     LogModule.log({
//       key1: "developer_login",
//       key2: "start",
//       text1: "Developer login started",
//       text2: `Email: ${email}`
//     });

//     const OTP = generateOtp();
//     await DeveloperOtp.deleteOne({ email });
//     await DeveloperOtp.create({ email, value: OTP });

//     LogModule.log({
//       key1: "developer_login",
//       key2: "success", 
//       text1: "Developer OTP sent",
//       text2: `Email: ${email}`
//     });

//     return { success: true, message: "OTP sent successfully" };
    
//   } catch (error) {
//     LogModule.error({
//       key1: "developer_login",
//       key2: "failed",
//       text1: "Developer login failed",
//       text2: `Email: ${email}`,
//       error: error.message,
//       stack: error.stack
//     });
//     throw error;
//   }
// };

// const verifyDeveloper = async (data) => {
//   const { otp, email } = data;
  
//   try {
//     LogModule.log({
//       key1: "verify_developer", 
//       key2: "start",
//       text1: "Developer verification started",
//       text2: `Email: ${email}`
//     });

//     const otpObject = await DeveloperOtp.findOne({ email });

//     if ((!email || otp != "1247") && (!otpObject || otp != otpObject.value)) {
//       LogModule.error({
//         key1: "verify_developer",
//         key2: "invalid_otp",
//         text1: "Invalid developer OTP",
//         text2: `Email: ${email}`,
//         error: "OTP validation failed"
//       });
//       throw new Error("Invalid email or otp");
//     }

//     await DeveloperOtp.deleteOne({ email });
//     const developer = await Developer.findOne({ email });

//     if (!developer) {
//       LogModule.error({
//         key1: "verify_developer",
//         key2: "not_found",
//         text1: "Developer not found",
//         text2: `Email: ${email}`,
//         error: "Developer does not exist"
//       });
//       throw new Error("Create a developer first to proceed.");
//     }

//     let refreshToken = generateRefreshToken();
//     const tokenEAT = Date.now() + REFRESH_TOKEN_EXPIRE_TIME;

//     const developerId = developer._id;

//     if (!developer.refreshToken || developer.tokenEAT <= Date.now()) {
//       await Developer.findByIdAndUpdate(developerId, { refreshToken, tokenEAT });
//     } else {
//       refreshToken = developer.refreshToken;
//     }

//     const accessToken = generateAccessToken({
//       developerId: developer._id,
//       email: email,
//       isAdmin: developer.isAdmin,
//       isDeveloper: developer.isDeveloper,
//       profile: developer.profile,
//       access: developer.access
//     });

//     LogModule.log({
//       key1: "verify_developer",
//       key2: "success",
//       text1: "Developer verified successfully",
//       text2: `Developer ID: ${developerId}`
//     });

//     return { refreshToken, accessToken };
    
//   } catch (error) {
//     LogModule.error({
//       key1: "verify_developer",
//       key2: "failed",
//       text1: "Developer verification failed",
//       text2: `Email: ${email}`,
//       error: error.message,
//       stack: error.stack
//     });
//     throw error;
//   }
// };

// export default {
//   verifyDeveloper,
//   login
// };


import Developer from "../../model/Developer.js";
import DeveloperOtp from "../../model/DeveloperOtp.js";
import LogModule from "../../service/log/index.js";
import { sendOtpEmail } from "../brevoService.js";
import { generateAccessToken, generateOtp, generateRefreshToken } from "./utils.js";
import { REFRESH_TOKEN_EXPIRE_TIME } from "../../constants/index.js";

const login = async (data) => {
  const { email } = data;
  
  if (!email) {
    return { status: 400, message: "Email required!" };
  }
  
  try {
    LogModule.log({
      key1: "developer_login",
      key2: "start",
      text1: "Developer login started",
      text2: `Email: ${email}`
    });

    const developer = await Developer.findOne({ email });
    if (!developer) {
      LogModule.error({
        key1: "developer_login",
        key2: "not_found",
        text1: "Developer not found",
        text2: `Email: ${email}`
      });
      return { success: false, message: "No developer account found with this email." };
    }

    const OTP = generateOtp();
    await DeveloperOtp.deleteOne({ email });
    await DeveloperOtp.create({ email, value: OTP });

    // ✅ Send OTP via Brevo
    try {
      await sendOtpEmail({ to: email, otp: OTP });
      LogModule.log({
        key1: "developer_login",
        key2: "success", 
        text1: "OTP sent successfully via email",
        text2: `Email: ${email}`
      });
    } catch (emailError) {
      LogModule.error({
        key1: "developer_login",
        key2: "email_send_failed",
        text1: "Failed to send OTP email",
        text2: `Email: ${email}`,
        error: emailError.message,
        stack: emailError.stack
      });
      // Option 1: Return error to user
      return { status: 500, message: "Failed to send OTP email. Please try again." };
    }

    return { success: true, message: "OTP sent successfully" };
    
  } catch (error) {
    LogModule.error({
      key1: "developer_login",
      key2: "failed",
      text1: "Developer login failed",
      text2: `Email: ${email}`,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const verifyDeveloper = async (data) => {
  const { otp, email } = data;
  
  if (!otp || !email) {
    return { status: 400, message: "Email and OTP is required!" };
  }
  
  try {
    LogModule.log({
      key1: "verify_developer", 
      key2: "start",
      text1: "Developer verification started",
      text2: `Email: ${email}`
    });

    const otpObject = await DeveloperOtp.findOne({ email });

    const isProduction = process.env.NODE_ENV === "production";
    const bypassOtp = !isProduction && otp == "1247";

    if (!bypassOtp && (!otpObject || otp != otpObject.value)) {
      LogModule.error({
        key1: "verify_developer",
        key2: "invalid_otp",
        text1: "Invalid developer OTP",
        text2: `Email: ${email}`,
        error: "OTP validation failed"
      });
      throw new Error("Invalid email or otp");
    }

    await DeveloperOtp.deleteOne({ email });
    const developer = await Developer.findOne({ email });

    if (!developer) {
      LogModule.error({
        key1: "verify_developer",
        key2: "not_found",
        text1: "Developer not found",
        text2: `Email: ${email}`,
        error: "Developer does not exist"
      });
      throw new Error("Create a developer first to proceed.");
    }

    let refreshToken = generateRefreshToken();
    const tokenEAT = Date.now() + REFRESH_TOKEN_EXPIRE_TIME;

    const developerId = developer._id;

    if (!developer.refreshToken || developer.tokenEAT <= Date.now()) {
      await Developer.findByIdAndUpdate(developerId, { refreshToken, tokenEAT });
    } else {
      refreshToken = developer.refreshToken;
    }

    const accessToken = generateAccessToken({
      developerId: developer._id,
      email: email,
      isAdmin: developer.isAdmin,
      isDeveloper: developer.isDeveloper,
      profile: developer.profile,
      access: developer.access
    });

    LogModule.log({
      key1: "verify_developer",
      key2: "success",
      text1: "Developer verified successfully",
      text2: `Developer ID: ${developerId}`
    });

    return { refreshToken, accessToken };
    
  } catch (error) {
    LogModule.error({
      key1: "verify_developer",
      key2: "failed",
      text1: "Developer verification failed",
      text2: `Email: ${email}`,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export default {
  verifyDeveloper,
  login
};