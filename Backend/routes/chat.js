import express from "express";
import authMiddleware from "../Middlewares/authMiddleware.js";

import {
    testThread,
    getThreads,
    getThreadById,
    deleteThread,
    sendMessage
} from "../controllers/chatController.js";

const router = express.Router();

// Test route
router.post("/test", authMiddleware, testThread);

// Get all threads
router.get("/thread", authMiddleware, getThreads);

// Get a specific thread
router.get("/thread/:threadId", authMiddleware, getThreadById);

// Delete a thread
router.delete("/thread/:threadId", authMiddleware, deleteThread);

// Send a chat message
router.post("/chat", authMiddleware, sendMessage);

export default router;