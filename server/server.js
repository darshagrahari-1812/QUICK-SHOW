import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import 'dotenv/config';
import connectDB from './config/db.js';
import { functions, inngest } from './inngest/index.js';
import { serve } from "inngest/express";
import userRouter from './routes/userRoutes.js';
import showRouter from './routes/showRoutes.js';
import axios from "axios";
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import { stripeWebhook } from './controllers/stripeWebhooks.js';

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB().catch((err) => {
    console.error("Initial DB connection error:", err);
});
//Stripe Webhooks Route
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

// Middleware
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(clerkMiddleware());

// API Routes
app.use('/api/inngest', serve({
    client: inngest,
    functions
}));

app.use('/api/show', showRouter);
app.use('/api/user', userRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/admin', adminRouter);

app.get('/', (req, res) => {
    res.json({
        status: 'Server is Live!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', async (req, res) => {
    try {
        await connectDB();
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Only listen directly when running locally or not in Vercel
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}

export default app;