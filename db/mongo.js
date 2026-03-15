import config from '../constants/config.js';
import mongoose from 'mongoose';

const { DB_URL } = config

export const connect = async () => {
    await mongoose.connect(DB_URL, { dbName: 'main' });
}

export default {
    connect,
}