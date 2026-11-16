import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";

import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/Auth.js";
import testEmail from "./routes/emailTest.js";
import voiceRoutes from "./routes/voice.js";
import voiceConversationRoutes from "./routes/voiceConversation.js";
import newsRoutes from "./routes/news.js";
import passport from "./config/passport.js";

const app = express();

const PORT = Number(process.env.PORT) || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
    "http://localhost:5173",
    "https://main.dppbhlekone08.amplifyapp.com"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));

// Initialize Passport
app.use(passport.initialize());

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "RockAI backend is running"
    });
});

// Routes
app.use("/api", chatRoutes);
app.use("/api", authRoutes);
app.use("/api", testEmail);
app.use("/api", voiceRoutes);
app.use("/api", voiceConversationRoutes);
app.use("/api/news", newsRoutes);

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

// Start server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`RockAI server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();