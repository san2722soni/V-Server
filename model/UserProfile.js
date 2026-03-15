import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const { ObjectId } = mongoose.Schema.Types;

const userProfileSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    characterId: {
        type: ObjectId,
        ref: "Character",
        required: true,
    },
    userId: {
        type: ObjectId,
        ref: "User",
        required: true,
        unique: true,
    }
}, { timestamps: true });

export default modelWrapper(mongoose.model("UserProfile", userProfileSchema));