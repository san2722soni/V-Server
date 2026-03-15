import mongoose from "mongoose";
import { GENDER, ROLES, PERMISSIONS } from "../constants/index.js";
import modelWrapper from "./modelWrapper.js";
const { ObjectId } = mongoose.Schema.Types;

const developerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    profileComplete: {
        type: Boolean,
        default: false,
    },
    refreshToken: {
        type: String,
    },
    tokenEAT: {
        type: Date
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isDeveloper: {
        type: Boolean,
        default: function (){
            return !this.isAdmin;
        }
    },
    access: [
        {
            type: String
        }
    ],
    profile: {
        name: {
            type: String,
        },
        role: {
            type: String,
            enum: [ROLES.FRONTEND, ROLES.BACKEND, ROLES.FULL_STACK]
        },
        gender: {
            type: String,
            enum: [GENDER.MALE, GENDER.FEMALE, GENDER.OTHER],
        },
        permissions: {
            type: String,
            enum: [PERMISSIONS.ALL , PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE]
        }
    },
    tickets: {
        type: [{type: ObjectId, ref: "Ticket"}]
    },
    devices: {
        type: [{type: ObjectId, ref: "DeviceData"}]
    }
}, { timestamps: true });

export default modelWrapper(mongoose.model("Developer", developerSchema));
