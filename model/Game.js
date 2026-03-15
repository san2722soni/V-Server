import mongoose from 'mongoose';
import modelWrapper from './modelWrapper.js';

const gameSchema = new mongoose.Schema({
    saltKey: {
        type: String,
    },
    players: {
        type: [{
            userId: {
                type: String,
            },
            secret: {
                type: String,
            },
            characterId: {
                type: String,
            },
            clientId: {
                type: Number
            }
        }],
    },
    serverIP:{
        type: String,
    }
}, { timestamps: true });

export default modelWrapper(mongoose.model("Game", gameSchema));