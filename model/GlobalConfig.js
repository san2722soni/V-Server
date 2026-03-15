import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const globalConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    valueType: {
        type: String,
        enum: ["string", "number", "boolean"],
        required: true,
    },
}, { timestamps: true });

export default modelWrapper(mongoose.model("GlobalConfig", globalConfigSchema));
