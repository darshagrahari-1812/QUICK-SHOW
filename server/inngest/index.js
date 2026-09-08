import { Inngest } from "inngest";
import connectDB from "../config/db.js";
import User from "../models/User.js";

// Create Inngest client
export const inngest = new Inngest({
    id: "movie-ticket-booking"
});

// Helper to extract user info from Clerk event data
const extractUserData = (data) => {
    const {
        id,
        first_name,
        last_name,
        email_addresses,
        primary_email_address_id,
        image_url
    } = data;

    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'User';
    
    // Find primary email or take first available email
    let primaryEmail = '';
    if (email_addresses && Array.isArray(email_addresses) && email_addresses.length > 0) {
        if (primary_email_address_id) {
            const primaryObj = email_addresses.find(e => e.id === primary_email_address_id);
            primaryEmail = primaryObj ? primaryObj.email_address : email_addresses[0].email_address;
        } else {
            primaryEmail = email_addresses[0].email_address;
        }
    }

    return {
        _id: id,
        email: primaryEmail,
        name: fullName,
        image: image_url || ''
    };
};

// Sync user creation
const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: {
            event: "clerk/user.created"
        }
    },
    async ({ event }) => {
        await connectDB();
        const userData = extractUserData(event.data);
        const user = await User.findByIdAndUpdate(userData._id, userData, {
            upsert: true,
            returnDocument: 'after'
        });
        console.log(`[Inngest] Created user in MongoDB: ${user.name} (${user.email}) [${user._id}]`);
        return { success: true, user };
    }
);

// Sync user deletion
const syncUserDeletion = inngest.createFunction(
    {
        id: "delete-user-with-clerk",
        triggers: {
            event: "clerk/user.deleted"
        }
    },
    async ({ event }) => {
        await connectDB();
        const { id } = event.data;
        await User.findByIdAndDelete(id);
        console.log(`[Inngest] Deleted user from MongoDB: ${id}`);
        return { success: true, deletedId: id };
    }
);

// Sync user updation
const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: {
            event: "clerk/user.updated"
        }
    },
    async ({ event }) => {
        await connectDB();
        const userData = extractUserData(event.data);
        const user = await User.findByIdAndUpdate(userData._id, userData, {
            upsert: true,
            returnDocument: 'after'
        });
        console.log(`[Inngest] Updated user in MongoDB: ${user.name} (${user.email}) [${user._id}]`);
        return { success: true, user };
    }
);

// Export all functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation
];