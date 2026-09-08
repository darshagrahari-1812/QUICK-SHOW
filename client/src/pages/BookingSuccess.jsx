import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircleIcon, Loader2Icon } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const BookingSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { axios } = useAppContext()

  const bookingId = searchParams.get('bookingId')
  const sessionId = searchParams.get('sessionId')

  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    const verify = async () => {
      if (!bookingId || !sessionId) {
        setStatus('error')
        return
      }
      try {
        const { data } = await axios.get(
          `/api/booking/verify?bookingId=${bookingId}&sessionId=${sessionId}`
        )
        if (data.success) {
          setStatus('success')
          setBooking(data.booking)
          toast.success('Booking confirmed! 🎉')
          setTimeout(() => navigate('/my-bookings'), 3500)
        } else {
          setStatus('error')
          toast.error(data.message || 'Payment verification failed')
        }
      } catch (err) {
        console.error('Verify error:', err)
        setStatus('error')
        toast.error('Could not verify payment. Please check My Bookings.')
      }
    }
    verify()
  }, [bookingId, sessionId])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2Icon className="w-16 h-16 text-primary animate-spin" />
            <h1 className="text-2xl font-semibold text-white">Confirming your booking…</h1>
            <p className="text-gray-400 text-sm">Please wait while we verify your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
            {/* Animated check circle */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mt-2">Booking Confirmed!</h1>
            <p className="text-gray-400 text-sm">
              Your seats are booked. Redirecting to My Bookings in a moment…
            </p>

            {booking && (
              <div className="mt-4 bg-primary/10 border border-primary/20 rounded-xl px-6 py-4 text-left w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Movie</span>
                  <span className="text-white font-medium">
                    {booking.show?.movie?.title || 'Movie Ticket'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Seats</span>
                  <span className="text-primary font-semibold">
                    {Array.isArray(booking.bookedSeats) ? booking.bookedSeats.join(', ') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="text-white font-medium">${booking.amount}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/my-bookings')}
              className="mt-4 bg-primary hover:bg-primary-dull text-white px-8 py-3 rounded-full font-medium text-sm transition active:scale-95 cursor-pointer"
            >
              Go to My Bookings
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-semibold text-white">Verification Failed</h1>
            <p className="text-gray-400 text-sm">
              We could not confirm your payment. If money was deducted, please check My Bookings or contact support.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => navigate('/my-bookings')}
                className="bg-primary hover:bg-primary-dull text-white px-6 py-2.5 rounded-full font-medium text-sm transition active:scale-95 cursor-pointer"
              >
                My Bookings
              </button>
              <button
                onClick={() => navigate('/movies')}
                className="border border-primary/40 text-gray-300 hover:bg-primary/10 px-6 py-2.5 rounded-full font-medium text-sm transition active:scale-95 cursor-pointer"
              >
                Browse Movies
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingSuccess
