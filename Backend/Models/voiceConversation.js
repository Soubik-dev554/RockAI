import mongoose from "mongoose";

const VoiceMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },

    text: {
        type: String,
        required: true,
        trim: true
    },

    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const VoiceConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    title: {
        type: String,
        default: "New Voice Conversation",
        trim: true
    },

    messages: {
        type: [VoiceMessageSchema],
        default: []
    }
}, {
    timestamps: true
});

VoiceConversationSchema.index({
    userId: 1,
    updatedAt: -1
});

export default mongoose.model(
    "VoiceConversation",
    VoiceConversationSchema
);