import mongoose from "mongoose";
import modelWrapper from "./modelWrapper.js";

const abilityKeySchema = new mongoose.Schema({
    value: { type: Number, default: 0 },
    description: { type: String, default: "" },
}, { _id: false });

const abilitySchema = new mongoose.Schema({
    Key1: { type: abilityKeySchema, default: () => ({}) },
    Key2: { type: abilityKeySchema, default: () => ({}) },
    Key3: { type: abilityKeySchema, default: () => ({}) },
    Key4: { type: abilityKeySchema, default: () => ({}) },
}, { _id: false });

const abilityItemSchema = new mongoose.Schema({
    abilityName: { type: String, required: true },
    abilityData: { type: abilitySchema, default: () => ({}) },
}, { _id: false });

const buildingSchema = new mongoose.Schema({
    health:{
        type: Number,
        required: true,
    },
    attack:{
        type: Number,
    },
    storage:{
        type: Number,
        required: true,
    },
    level:{
        type: Number,
    },
    name:{
        type: String,
        required: true,
    },
    abilities: {
        type: [abilityItemSchema],
        default: [],
    },
    bulletSpeed:{
        type: Number,
        default: 0,
    },
    fireRate:{
        type: Number,
        default: 0,
    },
    isActive:{
        type: Boolean,
        default: true,
    },
}, { timestamps: true});

export default modelWrapper(mongoose.model("Building", buildingSchema));
