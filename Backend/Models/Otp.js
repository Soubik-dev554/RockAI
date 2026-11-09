import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    otp: {
        type: String,
        required: true
    },

    expiresAt: {
        type: Date,
        required: true,
        expires: 0
    },

    attempts: {
        type: Number,
        default: 0
    },

    verified: {
        type: Boolean,
        default: false
    },

    lastSentAt: {
        type: Date,
        default: Date.now
    },

    resendLockUntil: {
        type: Date,
        default: null
    },
}, {
    timestamps: true
});

export default mongoose.model("OTP", OtpSchema);