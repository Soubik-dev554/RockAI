import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../Models/User.js";
import { sendEmail } from "../Services/emailService.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const RESET_TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

// Generate a SHA-256 hash of the reset token.
const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

// Generic response prevents email-account enumeration.
const forgotPasswordResponse = {
    success: true,
    message:
        "If an account exists for that email, password-reset instructions will be sent.",
};

// POST /api/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body ?? {};

        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: cleanEmail });

        // Do not reveal whether this email belongs to a registered user.
        if (!user) {
            return res.status(200).json(forgotPasswordResponse);
        }

        // Generate a cryptographically secure, unpredictable token.
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = hashToken(resetToken);

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(
            Date.now() + RESET_TOKEN_EXPIRY
        );

        await user.save();

        const resetLink =
            `${FRONTEND_URL}/reset-password/${resetToken}`;

        try {
            await sendEmail({
                to: user.email,
                subject: "Reset your RockAI password",
                text: [
                    "We received a request to reset your RockAI password.",
                    "",
                    `Open this link to reset your password: ${resetLink}`,
                    "",
                    "This link expires in 15 minutes.",
                    "If you did not request this, ignore this email.",
                ].join("\n"),
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222">
                        <h2>Reset your RockAI password</h2>
                        <p>We received a request to reset your password.</p>
                        <p>
                            <a
                                href="${resetLink}"
                                style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none"
                            >
                                Reset Password
                            </a>
                        </p>
                        <p>This link expires in 15 minutes.</p>
                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `,
            });
        } catch (emailError) {
            // Remove the token if sending the email fails.
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            throw emailError;
        }

        return res.status(200).json(forgotPasswordResponse);
    } catch (error) {
        console.error("Forgot password error:", {
            message: error.message,
            code: error.code,
            command: error.command,
            responseCode: error.responseCode,
        });
        return res.status(500).json({
            success: false,
            message: "Unable to process your request right now.",
        });
    }
};

// POST /api/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body ?? {};

        if (
            typeof token !== "string" ||
            !/^[a-f0-9]{64}$/i.test(token)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired password-reset link.",
            });
        }

        if (
            typeof password !== "string" ||
            password.length < MIN_PASSWORD_LENGTH ||
            password.length > MAX_PASSWORD_LENGTH
        ) {
            return res.status(400).json({
                success: false,
                message: "Password must contain between 8 and 72 characters.",
            });
        }

        const hashedToken = hashToken(token);

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() },
        }).select("+resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired password-reset link.",
            });
        }

        // Hash the new password using the same algorithm as registration.
        user.password = await bcrypt.hash(password, 12);

        // Make the reset token unusable after a successful reset.
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please sign in.",
        });
    } catch (error) {
        console.error("Reset password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reset your password right now.",
        });
    }
};

