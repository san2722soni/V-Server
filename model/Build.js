import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const buildSchema = new mongoose.Schema({
    version: {
        type: String,
        default: 'v1'
    },
    message: {
        type: String
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
    buildFailed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    failedAt: {
        type: Date
    },
    errorMessage: {
        type: String
    }
}, {timestamps: true});

export default modelWrapper(mongoose.model("Build", buildSchema));
