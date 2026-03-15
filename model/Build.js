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
    }
}, {timestamps: true});

export default modelWrapper(mongoose.model("Build", buildSchema));
