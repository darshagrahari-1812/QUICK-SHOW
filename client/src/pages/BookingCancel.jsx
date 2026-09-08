import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { XCircleIcon } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const BookingCancel = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { axios } = useAppContext()

  const bookingId = searchParams.get('bookingId')

  useEffect(() => {
    const cleanup = async () => {
      if (!bookingId) return
      try {
        await axios.post('/api/booking/cancel', { bookingId })
      } catch (err) {
        console.error('Cancel cleanup error:', err)
      }
    }
    cleanup()
    toast.error('Payment cancelled. Your seats have been released.')
  }, [bookingId])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-5">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <XCircleIcon className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white">Payment Cancelled</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          You cancelled the payment. Your seat selection has been released and no charge was made.
        </p>

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => navigate(-1)}
            className="bg-primary hover:bg-primary-dull text-white px-6 py-2.5 rounded-full font-medium text-sm transition active:scale-95 cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/movies')}
            className="border border-primary/40 text-gray-300 hover:bg-primary/10 px-6 py-2.5 rounded-full font-medium text-sm transition active:scale-95 cursor-pointer"
          >
            Browse Movies
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingCancel
