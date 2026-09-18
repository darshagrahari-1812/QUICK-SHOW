import 'dotenv/config';
import connectDB from './config/db.js';
import Booking from './models/Booking.js';
import Movie from './models/Movie.js';
import Show from './models/Show.js';
import User from './models/User.js';
import sendEmail from './config/nodeMailer.js';

async function run() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const booking = await Booking.findOne({ isPaid: true })
    .populate({
      path: 'show',
      populate: { path: 'movie', model: 'Movie' }
    })
    .populate('user');

  if (!booking) {
    console.log('No paid booking found in DB.');
    // Try finding ANY booking
    const anyBooking = await Booking.findOne()
      .populate({
        path: 'show',
        populate: { path: 'movie', model: 'Movie' }
      })
      .populate('user');
    
    if (anyBooking) {
      console.log('Found an unpaid booking to test email template:');
      console.log('Booking ID:', anyBooking._id);
      console.log('User:', anyBooking.user?.name, '| Email:', anyBooking.user?.email);
      console.log('Movie:', anyBooking.show?.movie?.title);

      const recipient = anyBooking.user?.email || process.env.SENDER_EMAIL;
      console.log('Sending test email to:', recipient);
      const res = await sendEmail({
        to: recipient,
        subject: `Payment Confirmation: "${anyBooking.show?.movie?.title || 'Movie'}" booked!`,
        body: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Hi ${anyBooking.user?.name || 'Customer'},</h2>
            <p>Your booking for <strong style="color: #F84565;">${anyBooking.show?.movie?.title || 'Movie'}</strong> is confirmed.</p>
            <p>Enjoy the show! 🍿</p>
          </div>
        `
      });
      console.log('EMAIL SENT SUCCESSFULLY! Response:', res.response, '| MessageID:', res.messageId);
    } else {
      console.log('No bookings found in database at all.');
    }
  } else {
    console.log('Found paid booking:');
    console.log('Booking ID:', booking._id);
    console.log('User:', booking.user?.name, '| Email:', booking.user?.email);
    console.log('Movie:', booking.show?.movie?.title);

    const recipient = booking.user?.email || process.env.SENDER_EMAIL;
    console.log('Sending test email to:', recipient);
    const res = await sendEmail({
      to: recipient,
      subject: `Payment Confirmation: "${booking.show?.movie?.title || 'Movie'}" booked!`,
      body: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hi ${booking.user?.name || 'Customer'},</h2>
          <p>Your booking for <strong style="color: #F84565;">${booking.show?.movie?.title || 'Movie'}</strong> is confirmed.</p>
          <p>Enjoy the show! 🍿</p>
        </div>
      `
    });
    console.log('EMAIL SENT SUCCESSFULLY! Response:', res.response, '| MessageID:', res.messageId);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
