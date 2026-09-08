import Stripe from "stripe";
import Booking from "../models/Booking.js";
export const stripeWebhook = async (req, res) => {
    const stripeInstace = new Stripe(process.env.STRIPE_SECRET_KEY)
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
                })
                const session = sessionList.data[0];
                const { bookingId } = session.metadata

                await Booking.findByIdAndUpdate(bookingId, {
                    isPaid: true,
                    paymentLink: ""
                })
                break;
            }



            default:
                console.log("Unhandled event type:", event.type);

        }
        res.json({ recieved: true })
    } catch (err) {
        console.log("Webhook processing error:", err);
        res.status(500).send("Internal Server Error")


    }
}