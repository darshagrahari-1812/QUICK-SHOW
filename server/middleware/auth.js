import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
    try {
        const auth = typeof req.auth === 'function' ? req.auth() : (req.auth || {});
        const userId = auth.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const user = await clerkClient.users.getUser(userId);

        if (user.privateMetadata?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        next();

    } catch (error) {
        console.error("ADMIN AUTH ERROR:", error);

        return res.status(401).json({
            success: false,
            message: "Authentication failed"
        });
    }
};