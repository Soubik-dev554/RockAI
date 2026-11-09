import express from "express";
import { register, sendOTP, verifyOTP } from "../controllers/authcontroller.js";
import { login } from "../controllers/LoginControler.js";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";
import rateLimit from "express-rate-limit";

// Maximum 3 OTP email requests per IP every 15 minutes
const sendOTPLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    message: {
        success: false,
        message: "Too many OTP requests. Please try again later."
    },
    standardHeaders: "draft-8",
    legacyHeaders: false
});

// Maximum 10 OTP verification requests per IP every 15 minutes
const verifyOTPLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {
        success: false,
        message: "Too many verification attempts. Please try again later."
    },
    standardHeaders: "draft-8",
    legacyHeaders: false
});

const router = express.Router();
router.post("/send-otp", sendOTPLimiter, sendOTP);
router.post("/verify-otp", verifyOTPLimiter, verifyOTP);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);


export default router;