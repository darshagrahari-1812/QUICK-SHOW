import Stripe from "stripe";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Function to check availability of selected seats for a movie
// Throws on DB/connection errors so callers can distinguish from seat conflicts
const checkSeatsAvailability = async (showId, selectedSeats) => {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    let occupiedFromShow = [];
    if (showData.occupiedSeats) {
        if (showData.occupiedSeats instanceof Map) {
            occupiedFromShow = Array.from(showData.occupiedSeats.keys());
        } else if (typeof showData.occupiedSeats === 'object') {
            occupiedFromShow = Object.keys(showData.occupiedSeats);
        }
    }

    const bookings = await Booking.find({ show: showId, isPaid: true });
    const occupiedFromBookings = bookings.flatMap(b => Array.isArray(b.bookedSeats) ? b.bookedSeats : []);

    const allOccupied = new Set([...occupiedFromShow, ...occupiedFromBookings]);

    const isAnySeatTaken = selectedSeats.some(seat => allOccupied.has(seat));
    return !isAnySeatTaken;
};

export const createBooking = async (req, res) => {
    try {
        const auth = typeof req.auth === 'function' ? req.auth() : (req.auth || {});
        const userId = auth.userId || req.body.userId;
        const { showId, selectedSeats } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!showId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid booking details" });
        }

        // Check if the seats are available — this will throw on DB errors (not silently return false)
        let isAvailable;
        try {
            isAvailable = await checkSeatsAvailability(showId, selectedSeats);
        } catch (dbError) {
            console.error("DB error during seat check:", dbError.message);
            return res.json({ success: false, message: "Server is temporarily unavailable. Please try again shortly." });
        }

        if (!isAvailable) {
            return res.json({ success: false, message: "Selected Seats are already booked or unavailable." });
        }

        // Get the show + movie details for the Stripe line item
        const showData = await Show.findById(showId).populate('movie');
        if (!showData) {
            return res.status(404).json({ success: false, message: "Show not found" });
        }

        const amount = (showData.showPrice || 0) * selectedSeats.length;
        const movieTitle = showData.movie?.title || 'Movie Ticket';
        const posterPath = showData.movie?.poster_path || '';
        const posterUrl = posterPath
            ? (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w300${posterPath}`)
            : undefined;

        // Create a PENDING booking (isPaid: false — confirmed only after Stripe payment)
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount,
            bookedSeats: selectedSeats,
            isPaid: false,
        });

        // Build Stripe Checkout session
        const origin = req.headers.origin || 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${movieTitle} — ${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''}`,
                            description: `Seats: ${selectedSeats.join(', ')}`,
                            ...(posterUrl ? { images: [posterUrl] } : {}),
                        },
                        unit_amount: Math.round((showData.showPrice || 0) * 100),
                    },
                    quantity: selectedSeats.length,
                },
            ],
            success_url: `${origin}/booking-success?bookingId=${booking._id}&sessionId={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/booking-cancel?bookingId=${booking._id}`,
            metadata: {
                bookingId: String(booking._id),
                userId,
                showId,
                seats: selectedSeats.join(','),
            },
        });

        booking.paymentLink = session.url;
        await booking.save();
        //Run Inngest scheduler func to check paymemt status after 10 min
        await inngest.send({
            name: "app/checkpayment",
            data: {
                bookingId: booking._id.toString(),
            },
        });

        return res.json({ success: true, url: session.url, bookingId: booking._id });

    } catch (error) {
        console.error('Create booking error:', error.message);
        return res.json({ success: false, message: error.message || 'Error processing booking' });
    }
};

// ── Verify Payment (Stripe success redirect) ──────────────────────────────────
export const verifyPayment = async (req, res) => {
    try {
        const { bookingId, sessionId } = req.query;

        if (!bookingId || !sessionId) {
            return res.status(400).json({ success: false, message: 'Missing bookingId or sessionId' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.json({ success: false, message: 'Payment not completed' });
        }

        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: { path: 'movie' },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking.isPaid) {
            return res.json({ success: true, message: 'Booking already confirmed', booking });
        }

        booking.isPaid = true;
        await booking.save();

        // Mark seats as occupied on the show document
        const showData = await Show.findById(booking.show._id || booking.show);
        if (showData) {
            if (!showData.occupiedSeats) showData.occupiedSeats = {};
            booking.bookedSeats.forEach((seat) => {
                showData.occupiedSeats[seat] = booking.user;
            });
            showData.markModified('occupiedSeats');
            await showData.save();
        }

        // Send booking confirmation email via Inngest
        try {
            await inngest.send({
                name: "app/sendBookingEmail",
                data: { bookingId: String(booking._id) }
            });
        } catch (inngestErr) {
            console.error("Failed to trigger sendBookingEmail event:", inngestErr.message);
        }

        return res.json({ success: true, message: 'Payment verified & booking confirmed!', booking });

    } catch (error) {
        console.error('Verify payment error:', error.message);
        return res.json({ success: false, message: error.message || 'Verification failed' });
    }
};

// ── Cancel Booking (Stripe cancel redirect) ───────────────────────────────────
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Missing bookingId' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.json({ success: false, message: 'Booking not found' });
        }

        if (booking.isPaid) {
            return res.json({ success: false, message: 'Cannot cancel a paid booking' });
        }

        await Booking.findByIdAndDelete(bookingId);
        return res.json({ success: true, message: 'Booking cancelled' });

    } catch (error) {
        console.error('Cancel booking error:', error.message);
        return res.json({ success: false, message: error.message });
    }
};

export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;

        const showData = await Show.findById(showId);
        if (!showData) {
            return res.status(404).json({
                success: false,
                message: "Show not found"
            });
        }

        let occupiedFromShow = [];
        if (showData.occupiedSeats) {
            if (showData.occupiedSeats instanceof Map) {
                occupiedFromShow = Array.from(showData.occupiedSeats.keys());
            } else if (typeof showData.occupiedSeats === 'object') {
                occupiedFromShow = Object.keys(showData.occupiedSeats);
            }
        }

        // Only count paid bookings — pending/cancelled ones don't block seats
        const bookings = await Booking.find({ show: showId, isPaid: true });
        const occupiedFromBookings = bookings.flatMap(b => Array.isArray(b.bookedSeats) ? b.bookedSeats : []);

        const occupiedSeats = Array.from(new Set([...occupiedFromShow, ...occupiedFromBookings]));

        return res.json({
            success: true,
            occupiedSeats
        });

    } catch (error) {
        console.error("Get occupied seats error:", error.message);
        return res.json({
            success: false,
            message: error.message
        });
    }
};

// API to create a Stripe checkout session for an unpaid booking
export const payBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            return res.status(400).json({ success: false, message: "Booking ID is required" });
        }

        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: { path: 'movie' },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.isPaid) {
            return res.json({ success: false, message: "This booking is already paid" });
        }

        const showData = booking.show;
        if (!showData) {
            return res.status(404).json({ success: false, message: "Associated show not found" });
        }

        const movieTitle = showData.movie?.title || 'Movie Ticket';
        const posterPath = showData.movie?.poster_path || '';
        const posterUrl = posterPath
            ? (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w300${posterPath}`)
            : undefined;

        const origin = req.headers.origin || 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${movieTitle} — ${booking.bookedSeats.length} Seat${booking.bookedSeats.length > 1 ? 's' : ''}`,
                            description: `Seats: ${booking.bookedSeats.join(', ')}`,
                            ...(posterUrl ? { images: [posterUrl] } : {}),
                        },
                        unit_amount: Math.round((showData.showPrice || 0) * 100),
                    },
                    quantity: booking.bookedSeats.length,
                },
            ],
            success_url: `${origin}/booking-success?bookingId=${booking._id}&sessionId={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/booking-cancel?bookingId=${booking._id}`,
            metadata: {
                bookingId: String(booking._id),
                userId: String(booking.user),
                showId: String(showData._id),
                seats: booking.bookedSeats.join(','),
            },
        });

        booking.paymentLink = session.url;
        await booking.save();

        return res.json({ success: true, url: session.url });

    } catch (error) {
        console.error("Pay booking error:", error.message);
        return res.json({ success: false, message: error.message || "Error processing payment" });
    }
};