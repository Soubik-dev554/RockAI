import mongoose from "mongoose";
import VoiceConversation from "../Models/voiceConversation.js";

// 1. Create a new voice conversation
export const createVoiceConversation = async (req, res) => {
    try {
        const conversation = await VoiceConversation.create({
            userId: req.user.userId,
            title: "New Voice Conversation",
            messages: []
        });

        return res.status(201).json({
            success: true,
            conversation
        });

    } catch (error) {
        console.error("Create voice conversation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create voice conversation."
        });
    }
};


// 2. Save a voice message
export const saveVoiceMessage = async (req, res) => {
    try {
        const { conversationId, role, text } = req.body ?? {};

        // Validate input
        if (
            !mongoose.Types.ObjectId.isValid(conversationId) ||
            !["user", "assistant"].includes(role) ||
            typeof text !== "string" ||
            !text.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid conversation ID, role and text are required."
            });
        }

        const conversation = await VoiceConversation.findOne({
            _id: conversationId,
            userId: req.user.userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Voice conversation not found."
            });
        }

        // Save message
        conversation.messages.push({
            role,
            text: text.trim()
        });

        // Set conversation title from the first user message
        if (
            role === "user" &&
            conversation.title === "New Voice Conversation"
        ) {
            conversation.title = text.trim().slice(0, 60);
        }

        conversation.updatedAt = new Date();

        await conversation.save();

        return res.status(200).json({
            success: true,
            message: "Voice message saved successfully.",
            conversationId: conversation._id
        });

    } catch (error) {
        console.error("Save voice message error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save voice message."
        });
    }
};


// 3. Get all voice conversations
export const getVoiceConversations = async (req, res) => {
    try {
        const conversations = await VoiceConversation.find({
            userId: req.user.userId
        })
            .select("title createdAt updatedAt")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            conversations
        });

    } catch (error) {
        console.error("Get voice conversations error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch voice conversations."
        });
    }
};


// 4. Get one voice conversation
export const getVoiceConversationById = async (req, res) => {
    try {
        const { conversationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID."
            });
        }

        const conversation = await VoiceConversation.findOne({
            _id: conversationId,
            userId: req.user.userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Voice conversation not found."
            });
        }

        return res.status(200).json({
            success: true,
            conversation
        });

    } catch (error) {
        console.error("Get voice conversation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch voice conversation."
        });
    }
};


// 5. Delete a voice conversation
export const deleteVoiceConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID."
            });
        }

        const conversation = await VoiceConversation.findOneAndDelete({
            _id: conversationId,
            userId: req.user.userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Voice conversation not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Voice conversation deleted successfully."
        });

    } catch (error) {
        console.error("Delete voice conversation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete voice conversation."
        });
    }
};