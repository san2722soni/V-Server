import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const deviceDataSchema = new mongoose.Schema({
    fcmToken:{
        type: String,
    },
    device:{
        type: String,
    },
    bundleVersion: {
        type: String,
    },
    appVersion: {
        type: String,
    },
    appxCity: {
        type: String,
    },
}, { timestamps: true});

export default modelWrapper(mongoose.model("DeviceData", deviceDataSchema));
