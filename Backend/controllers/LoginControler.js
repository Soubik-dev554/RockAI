import User from "../Models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"

export const login = async (req, res) => {
    try {
        // 1. Get email and password
        const { email, password } = req.body ?? {};

        // 2. Validate input
        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        // 3. Find user by email
        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        // 4. Verify password
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // 5. Ensure JWT configuration exists
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        // 6. Generate JWT
        const token = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // 7. Login successful
        return res.status(200).json({
            success: true,
            message: "Login successful.",
             token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
};