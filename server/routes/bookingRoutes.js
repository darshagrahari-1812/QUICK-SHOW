import express from 'express';
import { createBooking, getOccupiedSeats, payBooking, verifyPayment, cancelBooking } from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking);
bookingRouter.post('/pay', payBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);
bookingRouter.get('/verify', verifyPayment);
bookingRouter.post('/cancel', cancelBooking);

export default bookingRouter;