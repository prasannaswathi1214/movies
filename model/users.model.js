import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    Email: {
        type: String,
        required: true
    },
    Password: {
        type: String,
        required: true
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
