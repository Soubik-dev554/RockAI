import express from "express";
import rateLimit from "express-rate-limit";

import authMiddleware from "../Middlewares/authMiddleware.js";

import {
    createVoiceToken
} from "../controllers/voiceController.js";

const router = express.Router();

const voiceTokenLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    message: {
        success: false,
        message: "Too many voice requests. Please try again later."
    },
    standardHeaders: "draft-8",
    legacyHeaders: false
});

router.post(
    "/voice/token",
    authMiddleware,
    voiceTokenLimiter,
    createVoiceToken
);

export default router;