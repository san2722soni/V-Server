import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const clientBuildSchema = new mongoose.Schema({
    version: {
        type: String,
        default: 'v1'
    },
    message: {
        type: String
    },
    platform: {
        type: String,
        enum: ["windows", "android"],
        required: true
    },
    releaseType: {
        type: String,
        enum: ["release", "development"],
        default: "release"
    },
    buildFormat: {
        type: String,
        enum: ["apk", "aab"],
        default: null
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    buildCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    buildFailed: {
        type: Boolean,
        default: false
    },
    failedAt: {
        type: Date
    },
    errorMessage: {
        type: String
    },
    s3Link: {
        type: String,
        default: ""
    }
}, { timestamps: true });

export default modelWrapper(mongoose.model("ClientBuild", clientBuildSchema));