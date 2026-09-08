import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";

// Helper to get userId from req.auth safely
const getUserId = (req) => {
    const auth = typeof req.auth === 'function' ? req.auth() : (req.auth || {});
    return auth.userId || null;
};

// API Controller Function to Get User Bookings
export const getUserBookings = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const bookings = await Booking.find({ user: userId })
            .populate({
                path: "show",
                populate: { path: "movie" }
            })
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            bookings
        });

    } catch (error) {
        console.error("Get user bookings error:", error.message);
        return res.json({
            success: false,
            message: error.message
        });
    }
};

// API controller func to update favorite movie in clerk user metadata
export const updateFavorite = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const user = await clerkClient.users.getUser(userId);
        const privateMetadata = user.privateMetadata || {};
        let favorites = Array.isArray(privateMetadata.favorites) ? [...privateMetadata.favorites] : [];

        if (!favorites.includes(movieId)) {
            favorites.push(movieId);
        } else {
            favorites = favorites.filter(item => item !== movieId);
        }

        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata: {
                ...privateMetadata,
                favorites
            }
        });

        return res.json({ success: true, message: "Favorite movies updated", favorites });
    } catch (error) {
        console.error("Update favorite error:", error.message);
        return res.json({ success: false, message: error.message });
    }
};

// API controller to get user favorite movies
export const getFavorites = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const user = await clerkClient.users.getUser(userId);
        const favorites = user.privateMetadata?.favorites || [];

        // Getting movies from database
        const movies = await Movie.find({ _id: { $in: favorites } });

        return res.json({ success: true, movies });
    } catch (error) {
        console.error("Get favorites error:", error.message);
        return res.json({ success: false, message: error.message });
    }
};

// API controller to sync user from client
export const syncUser = async (req, res) => {
    try {
        const { id, name, email, image } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await User.findByIdAndUpdate(
            id,
            {
                _id: id,
                name: name || 'User',
                email: email || '',
                image: image || ''
            },
            { upsert: true, returnDocument: 'after' }
        );

        return res.json({ success: true, user });
    } catch (error) {
        console.error("Sync user error:", error.message);
        return res.json({ success: false, message: error.message });
    }
};
