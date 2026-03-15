import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const whitelistedUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
}, { timestamps: true });

export default modelWrapper(mongoose.model("WhitelistedUser", whitelistedUserSchema));
