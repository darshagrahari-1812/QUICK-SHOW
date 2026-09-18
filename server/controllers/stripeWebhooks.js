import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";
import { sendBookingConfirmationEmail } from "../config/nodeMailer.js";

export const stripeWebhook = async (req, res) => {
    const stripeInstace = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripeInstace.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        return res.status(400).send(`Webhook error : ${error.message}`);
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const sessionList = await stripeInstace.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                });
                const session = sessionList.data[0];
                const bookingId = session?.metadata?.bookingId;

                if (bookingId) {
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: ""
                    });

                    // Send confirmation email directly
                    sendBookingConfirmationEmail(bookingId).catch(err => {
                        console.error("Direct email send error in webhook:", err.message);
                    });

                    // Also dispatch to Inngest
                    await inngest.send({
                        name: "app/sendBookingEmail",
                        data: { bookingId }
                    });
                }
                break;
            }

            case 'checkout.session.completed': {
                const session = event.data.object;
                const bookingId = session?.metadata?.bookingId;

                if (bookingId) {
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: ""
                    });

                    // Send confirmation email directly
                    sendBookingConfirmationEmail(bookingId).catch(err => {
                        console.error("Direct email send error in webhook:", err.message);
                    });

                    // Also dispatch to Inngest
                    await inngest.send({
                        name: "app/sendBookingEmail",
                        data: { bookingId }
                    });
                }
                break;
            }

            default:
                console.log("Unhandled event type:", event.type);
        }
        res.json({ received: true });
    } catch (err) {
        console.log("Webhook processing error:", err);
        res.status(500).send("Internal Server Error");
    }
};