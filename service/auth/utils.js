import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRE_TIME_IN_SECS, JWT_SECRET_KEY } from "../../constants/index.js";
import { createHash } from "crypto";
import { randomId } from "../../util/index.js";


export const generateAccessToken = (data) => {
    const accessToken = jwt.sign(data, JWT_SECRET_KEY, {
        expiresIn: ACCESS_TOKEN_EXPIRE_TIME_IN_SECS,
    });
    return accessToken;
};

export const decodeAcccessToken = (token) => {
    try {
        const decodedData = jwt.verify(token, JWT_SECRET_KEY);
        return decodedData;
    } catch (err) {
        return null;
    }
};

export const generateOtp = () => {
    let value = Math.floor(Math.random() * 1e6).toString();
    while (value.length !== 6) {
        value = "0" + value;
    }
    return value;
};

export const generateRefreshToken = () => {
    return randomId();
};

export const processPassword = (password) => {
    const hash = createHash("sha256");
    hash.write(password + PASSWORD_SALT);
    return hash.digest("base64");
};