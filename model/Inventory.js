import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
    capacity:{
        type: Number,
        required: true,
    },
    freeCapacity:{
        type: Number,
        required: true,
    }
});

export default inventorySchema;