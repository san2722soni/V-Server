import mongoose from 'mongoose'

const Schema = new mongoose.Schema({
    day: {
        type: Number,
    },
    month: {
        type: Number,
    },
    year: {
        type: Number,
    },
})

export default Schema;