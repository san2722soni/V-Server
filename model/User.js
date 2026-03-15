import mongoose from "mongoose";
import DateSchema from "./schema/Date.js";
import { GENDER } from "../constants/index.js";
import modelWrapper from "./modelWrapper.js";
const { ObjectId }  = mongoose.Schema.Types;

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    profileComplete: {
        type: Boolean,
        default: false,
    },
    isUser: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String,
    },
    tokenEAT: {
        type: Date,
    },
    profile: {
        name: {
            type: String,
        },
        dob: {
            type: DateSchema,
        },
        gender: {
            type: String,
            enum: [GENDER.MALE, GENDER.FEMALE, GENDER.OTHER],
        },
    },
    tickets: {
        type: [{ type: ObjectId, ref: "Ticket" }],
    },
    devices: {
        type: [{ type: ObjectId, ref: "DeviceData" }],
    },
}, { timestamps: true});

export default modelWrapper(mongoose.model("User", userSchema));
