import mongoose from 'mongoose';
import modelWrapper from './modelWrapper.js';

const lobbySchema = new mongoose.Schema({
    lobbyId: { 
        type: String,
        unique: true,
        required: true
    },
    lobbyName: {
        type: String,
    },
    creatorId: {
        type: String,
        required: true
    },
    members: [
        {
            userId: String,
            joinedAt: { type: Date, default: Date.now }
        }
    ],
    inGame: { type: Boolean, default: false },
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        default: null
    },
    gameCompleted: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

export default modelWrapper(mongoose.model('Lobby', lobbySchema));