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

const inventorySchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    attack:{
        type: Number,
    },
    health:{
        type: Number,
    },
    range:{
        type: Number,
    },
    duration:{
        type: Number,
    },
    round:{
        type: Number,
    },
    storageCost:{
        type: Number,
    },
    purchaseCost:{
        type: Number,
    },
    abilities: {
        type: [abilityItemSchema],
        default: [],
    },
    isActive:{
        type: Boolean,
        default: true,
    },
}, { timestamps: true});

export default modelWrapper(mongoose.model("Inventory", inventorySchema));
