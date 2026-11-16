import express from "express";
import rateLimit from "express-rate-limit";

import authMiddleware from "../Middlewares/authMiddleware.js";

import {
    createVoiceConversation,
    saveVoiceMessage,
    getVoiceConversations,
    getVoiceConversationById,
    deleteVoiceConversation
} from "../controllers/voiceConversationController.js";

const router = express.Router();

const voiceHistoryLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    message: {
        success: false,
        message: "Too many voice history requests. Please try again later."
    },
    standardHeaders: "draft-8",
    legacyHeaders: false
});

router.use(authMiddleware, voiceHistoryLimiter);

router.post("/voice/conversations", createVoiceConversation);

router.post("/voice/conversations/message", saveVoiceMessage);

router.get("/voice/conversations", getVoiceConversations);

router.get("/voice/conversations/:conversationId", getVoiceConversationById);

router.delete("/voice/conversations/:conversationId", deleteVoiceConversation);

export default router;