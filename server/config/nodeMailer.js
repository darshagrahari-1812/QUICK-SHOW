import nodemailer from "nodemailer";
import connectDB from "./db.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, body }) => {
    const response = await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to,
        subject,
        html: body
    });
    return response;
};

export const sendBookingConfirmationEmail = async (bookingId) => {
    try {
        await connectDB();
        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: { path: "movie", model: "Movie" }
        }).populate("user");

        if (!booking || !booking.user?.email) {
            console.log(`[Email] Booking or user email not found for ID: ${bookingId}`);
            return { success: false, message: "Booking or user email not found" };
        }

        if (booking.isEmailSent) {
            console.log(`[Email] Confirmation email already sent for booking: ${bookingId}`);
            return { success: true, message: "Email already sent" };
        }

        const movieTitle = booking.show?.movie?.title || 'Movie';
        const formattedDate = booking.show?.showDateTime
            ? new Date(booking.show.showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full' })
            : 'N/A';
        const formattedTime = booking.show?.showDateTime
            ? new Date(booking.show.showDateTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', timeStyle: 'short' })
            : 'N/A';
        const seats = Array.isArray(booking.bookedSeats) ? booking.bookedSeats.join(', ') : booking.bookedSeats;

        const mailResponse = await sendEmail({
            to: booking.user.email,
            subject: `Payment Confirmation: "${movieTitle}" booked!`,
            body: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #1a202c; margin-top: 0;">Hi ${booking.user.name || 'there'},</h2>
                <p style="color: #4a5568; font-size: 16px;">
                    Your booking for <strong style="color: #F84565;">${movieTitle}</strong> has been successfully confirmed! 🎉
                </p>
                <div style="background-color: #f7fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #edf2f7;">
                    <p style="margin: 6px 0; color: #4a5568;"><strong>Seats:</strong> <span style="color: #F84565; font-weight: bold;">${seats}</span></p>
                    <p style="margin: 6px 0; color: #4a5568;"><strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 6px 0; color: #4a5568;"><strong>Time:</strong> ${formattedTime}</p>
                    <p style="margin: 6px 0; color: #4a5568;"><strong>Amount Paid:</strong> $${booking.amount}</p>
                    <p style="margin: 6px 0; color: #4a5568;"><strong>Booking ID:</strong> <span style="font-family: monospace; font-size: 13px;">${booking._id}</span></p>
                </div>
                <p style="color: #4a5568;">Enjoy the show! 🍿</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #a0aec0; font-size: 13px; margin-bottom: 0;">
                    Thanks for booking with us!<br/>
                    <strong>QuickShow Team</strong>
                </p>
            </div>
            `
        });

        booking.isEmailSent = true;
        await booking.save();
        console.log(`[Email] Confirmation email sent successfully to ${booking.user.email} (Booking: ${bookingId})`);
        return { success: true, mailResponse };
    } catch (error) {
        console.error(`[Email] Failed to send booking confirmation email for ${bookingId}:`, error.message);
        return { success: false, error: error.message };
    }
};

export default sendEmail;