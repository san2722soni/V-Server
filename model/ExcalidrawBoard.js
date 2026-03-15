import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const excalidrawBoardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        default: "Untitled Board",
    },
    s3Key: {
        type: String,
        required: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    updatedBy: {
        type: String,
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

export default modelWrapper(mongoose.model("ExcalidrawBoard", excalidrawBoardSchema));
