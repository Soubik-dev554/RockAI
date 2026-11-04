import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    try {
        // 1. Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const token = authHeader.split(" ")[1];

        // 2. Check JWT configuration
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing.");

            return res.status(500).json({
                success: false,
                message: "Internal server error."
            });
        }

        // 3. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Validate payload
        if (typeof decoded === "string" || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        // 5. Attach authenticated user to request
        req.user = {
            userId: decoded.userId
        };

        // 6. Continue to the next middleware or controller
        next();

    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token."
            });
        }

        console.error("Authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

export default authMiddleware;