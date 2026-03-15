import mongoose from "mongoose";

const shieldSchema = new mongoose.Schema({
    reductionValue:{
        type: Number,
        required: true,
    },
    alterType:{
        type: String,
        enum: ["Flat", "Percentage"],
        required: true,
    },
    shape:{
        type: String,
        required: true,
    },
    weight:{
        type: Number,
        required: true,
    }
});

export default shieldSchema;
