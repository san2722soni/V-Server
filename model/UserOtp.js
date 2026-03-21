import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const Schema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    value: {
        type: String,
        required: true,
    },
    expireAt: {
        type: Date,
        default: Date.now,
        expires: 600,
    },
});

export default modelWrapper(mongoose.model("UserOtp", Schema));