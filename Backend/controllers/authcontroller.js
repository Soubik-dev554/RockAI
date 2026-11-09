import User from "../Models/User.js";
import OTP from "../Models/Otp.js";
import crypto from "crypto";
import { sendEmail } from "../Services/emailService.js";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
    try {
        const { email } = req.body;

        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Find the verified registration.
        const pendingUser = await OTP.findOne({
            email: cleanEmail,
            verified: true
        });

        if (!pendingUser) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before registering."
            });
        }

        // Check OTP registration expiration.
        if (pendingUser.expiresAt <= new Date()) {
            await OTP.deleteOne({ _id: pendingUser._id });

            return res.status(410).json({
                success: false,
                message: "Verification expired. Please register again."
            });
        }

        // Check whether the account already exists.
        const userExists = await User.exists({
            email: cleanEmail
        });

        if (userExists) {
            await OTP.deleteOne({ _id: pendingUser._id });

            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }

        // Create permanent user account.
        const newUser = await User.create({
            name: pendingUser.name,
            email: pendingUser.email,
            password: pendingUser.password
        });

        // Remove temporary OTP record.
        await OTP.deleteOne({
            _id: pendingUser._id
        });

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
};

export const sendOTP = async (req, res) => {
    let pendingUserId = null;

    try {
        const { name, email, password } = req.body;

        // 1. Validate input
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName || !cleanEmail || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        if (password.length < 8 || password.length > 28) {
            return res.status(400).json({
                success: false,
                message: "Password must contain 8 to 28 characters."
            });
        }

        // 2. Check existing account
        const userExists = await User.exists({
            email: cleanEmail
        });

        if (userExists) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }

        // 3. Generate and hash OTP
        const otp = crypto.randomInt(0, 1000000)
            .toString()
            .padStart(6, "0");

        const hashedOTP = await bcrypt.hash(otp, 10);
        const hashedPassword = await bcrypt.hash(password, 12);

        const now = new Date();

        const newOTPData = {
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            otp: hashedOTP,
            attempts: 0,
            verified: false,
            expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
            lastSentAt: now
        };

        // 4. Atomically reserve an existing OTP record
        const reservationTime = new Date(now.getTime() - 60 * 1000);

        let pendingUser = await OTP.findOneAndUpdate(
            {
                email: cleanEmail,
                lastSentAt: { $lte: reservationTime }
            },
            {
                $set: newOTPData
            },
            {
                new: true
            }
        );

        // 5. Handle first-time registration
        if (!pendingUser) {
            const existingOTP = await OTP.findOne({
                email: cleanEmail
            });

            if (existingOTP) {
                const remainingSeconds = Math.max(
                    1,
                    Math.ceil(
                        (60000 - (Date.now() - existingOTP.lastSentAt.getTime())) / 1000
                    )
                );

                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`
                });
            }

            try {
                pendingUser = await OTP.create(newOTPData);
            } catch (error) {
                if (error.code === 11000) {
                    return res.status(429).json({
                        success: false,
                        message: "An OTP request is already being processed. Please try again shortly."
                    });
                }

                throw error;
            }
        }

        pendingUserId = pendingUser._id;

        // 6. Send OTP through Brevo
        try {
            await sendEmail({
                to: cleanEmail,
                subject: "Verify Your RockAI Account",
                text: `Your RockAI verification code is ${otp}. It expires in 5 minutes.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Welcome to RockAI!</h2>
                        <p>Your email verification code is:</p>
                        <h1 style="letter-spacing: 8px; color: #2563eb;">
                            ${otp}
                        </h1>
                        <p>This code expires in 5 minutes.</p>
                        <p>If you did not request this code, ignore this email.</p>
                    </div>
                `
            });
        } catch (emailError) {
            // Delete only if this request's OTP is still the current record.
            await OTP.deleteOne({
                _id: pendingUserId,
                otp: hashedOTP
            });

            throw emailError;
        }

        return res.status(200).json({
            success: true,
            message: "Verification code sent successfully."
        });

    } catch (error) {
        console.error("Send OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to send verification code. Please try again."
        });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 1. Validate input
        if (
            typeof email !== "string" ||
            typeof otp !== "string" ||
            !email.trim() ||
            !/^\d{6}$/.test(otp)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email and six-digit OTP."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 2. Find pending registration
        const pendingUser = await OTP.findOne({
            email: cleanEmail
        });

        if (!pendingUser) {
            return res.status(404).json({
                success: false,
                message: "No pending verification found. Please request a new OTP."
            });
        }

        // 3. Check whether already verified
        if (pendingUser.verified) {
            return res.status(200).json({
                success: true,
                message: "Email is already verified."
            });
        }

        // 4. Check expiration
        const now = new Date();

        if (pendingUser.expiresAt <= now) {
            await OTP.deleteOne({
                _id: pendingUser._id,
                verified: false
            });

            return res.status(410).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // 5. Check maximum attempts
        if (pendingUser.attempts >= 5) {
            await OTP.deleteOne({
                _id: pendingUser._id,
                verified: false
            });

            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts. Please request a new OTP."
            });
        }

        // 6. Compare OTP with its hashed version
        const isMatch = await bcrypt.compare(
            otp,
            pendingUser.otp
        );

        if (!isMatch) {
            // Atomic increment prevents simultaneous requests
            // from overwriting each other's attempt counts.
            const updatedUser = await OTP.findOneAndUpdate(
                {
                    _id: pendingUser._id,
                    verified: false,
                    otp: pendingUser.otp,
                    expiresAt: { $gt: new Date() },
                    attempts: { $lt: 5 }
                },
                {
                    $inc: { attempts: 1 }
                },
                {
                    new: true
                }
            );

            if (!updatedUser) {
                return res.status(409).json({
                    success: false,
                    message: "Verification state changed. Please try again."
                });
            }

            if (updatedUser.attempts >= 5) {
                await OTP.deleteOne({
                    _id: updatedUser._id,
                    verified: false,
                    otp: updatedUser.otp
                });

                return res.status(429).json({
                    success: false,
                    message: "Too many incorrect attempts. Please request a new OTP."
                });
            }

            return res.status(400).json({
                success: false,
                message: "Incorrect OTP. Please try again."
            });
        }

        // 7. Atomically mark email as verified
        const verifiedUser = await OTP.findOneAndUpdate(
            {
                _id: pendingUser._id,
                verified: false,
                otp: pendingUser.otp,
                expiresAt: { $gt: new Date() },
                attempts: { $lt: 5 }
            },
            {
                $set: {
                    verified: true
                }
            },
            {
                new: true
            }
        );

        if (!verifiedUser) {
            return res.status(409).json({
                success: false,
                message: "OTP is no longer valid. Please request a new one."
            });
        }

        // 8. Success response
        return res.status(200).json({
            success: true,
            message: "Email verified successfully."
        });

    } catch (error) {
        console.error("OTP verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify OTP. Please try again."
        });
    }
};