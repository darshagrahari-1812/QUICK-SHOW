import { Inngest } from "inngest";
import connectDB from "../config/db.js";
import User from "../models/User.js";

import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

// Create Inngest client
export const inngest = new Inngest({
    id: "movie-ticket-booking",
});


// Helper to extract user info from Clerk event data
const extractUserData = (data) => {
    const {
        id,
        first_name,
        last_name,
        email_addresses,
        primary_email_address_id,
        image_url,
    } = data;

    const fullName =
        `${first_name || ""} ${last_name || ""}`.trim() || "User";

    let primaryEmail = "";

    if (
        email_addresses &&
        Array.isArray(email_addresses) &&
        email_addresses.length > 0
    ) {
        if (primary_email_address_id) {
            const primaryObj = email_addresses.find(
                (e) => e.id === primary_email_address_id
            );

            primaryEmail = primaryObj
                ? primaryObj.email_address
                : email_addresses[0].email_address;
        } else {
            primaryEmail = email_addresses[0].email_address;
        }
    }

    return {
        _id: id,
        email: primaryEmail,
        name: fullName,
        image: image_url || "",
    };
};


// ---------------------------------------------------
// Sync user creation
// ---------------------------------------------------

const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: {
            event: "clerk/user.created",
        },
    },
    async ({ event }) => {
        await connectDB();

        const userData = extractUserData(event.data);

        const user = await User.findByIdAndUpdate(
            userData._id,
            userData,
            {
                upsert: true,
                returnDocument: "after",
            }
        );

        console.log(
            `[Inngest] Created user in MongoDB: ${user.name} (${user.email}) [${user._id}]`
        );

        return {
            success: true,
            user,
        };
    }
);


// ---------------------------------------------------
// Sync user deletion
// ---------------------------------------------------

const syncUserDeletion = inngest.createFunction(
    {
        id: "delete-user-with-clerk",
        triggers: {
            event: "clerk/user.deleted",
        },
    },
    async ({ event }) => {
        await connectDB();

        const { id } = event.data;

        await User.findByIdAndDelete(id);

        console.log(
            `[Inngest] Deleted user from MongoDB: ${id}`
        );

        return {
            success: true,
            deletedId: id,
        };
    }
);


// ---------------------------------------------------
// Sync user updation
// ---------------------------------------------------

const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: {
            event: "clerk/user.updated",
        },
    },
    async ({ event }) => {
        await connectDB();

        const userData = extractUserData(event.data);

        const user = await User.findByIdAndUpdate(
            userData._id,
            userData,
            {
                upsert: true,
                returnDocument: "after",
            }
        );

        console.log(
            `[Inngest] Updated user in MongoDB: ${user.name} (${user.email}) [${user._id}]`
        );

        return {
            success: true,
            user,
        };
    }
);


// ---------------------------------------------------
// Release seats and delete unpaid booking
// after 10 minutes
// ---------------------------------------------------

const releaseSeatsAndDeleteBookings = inngest.createFunction(
    {
        id: "release-seats-and-delete-bookings",
    },
    {
        event: "app/checkpayment",
    },
    async ({ event, step }) => {

        // Wait for 10 minutes
        const tenMinutesLater = new Date(
            Date.now() + 10 * 60 * 1000
        );

        await step.sleepUntil(
            "wait-for-10-minutes",
            tenMinutesLater
        );


        // Check payment status
        const result = await step.run(
            "check-payment-status",
            async () => {

                await connectDB();

                // FIX 1:
                // event.date -> event.data
                const bookingId = event.data.bookingId;

                const booking = await Booking.findById(
                    bookingId
                );


                // Booking doesn't exist
                if (!booking) {
                    console.log(
                        `[Inngest] Booking not found for id: ${bookingId}`
                    );

                    return {
                        success: false,
                        message: "Booking not found",
                    };
                }


                // Payment already completed
                if (booking.isPaid) {
                    console.log(
                        `[Inngest] Booking ${bookingId} is already paid`
                    );

                    return {
                        success: true,
                        message: "Booking already paid",
                    };
                }


                // Get show
                const show = await Show.findById(
                    booking.show
                );


                if (!show) {
                    console.log(
                        `[Inngest] Show not found for booking ${bookingId}`
                    );

                    return {
                        success: false,
                        message: "Show not found",
                    };
                }


                // Release occupied seats
                booking.bookedSeats.forEach((seat) => {

                    // FIX 2:
                    // seat instead of seats
                    delete show.occupiedSeats[seat];

                });


                // Tell Mongoose that object was modified
                show.markModified("occupiedSeats");

                await show.save();


                // Delete unpaid booking
                await Booking.findByIdAndDelete(
                    booking._id
                );


                console.log(
                    `[Inngest] Released seats and deleted unpaid booking: ${bookingId}`
                );


                return {
                    success: true,
                    message: "Seats released and booking deleted",
                    bookingId,
                };
            }
        );


        return result;
    }
);


// ---------------------------------------------------
// Export all functions
// ---------------------------------------------------

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBookings,
];