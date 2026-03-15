import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const clientBuildSchema = new mongoose.Schema({
    version: {
        type: String,
        deffault: 'v1'
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
    s3Link: {
        type: String,
        default: ""
    }
}, { timestamps: true });

export default modelWrapper(mongoose.model("ClientBuild", clientBuildSchema));