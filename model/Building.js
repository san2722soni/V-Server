import mongoose from "mongoose";
//TODO: import diff inventory

const buildingSchema = new mongoose.Schema({
    health:{
        type: Number,
        required: true,
    },
    maxHealth:{
        type: Number,
        required: true,
    },
    attack:{
        type: Number,
        required: true,
    },
    storage:{
        type: Number,
        required: true,
    },
    maxStorage:{
        type: Number,
        required: true,
    },
    inventory:{
        type: [inventorySchema],
        required: true,
    },
    level:{
        type: Number,
        required: true,
    }
}, { timestamps: true});

export default buildingSchema;