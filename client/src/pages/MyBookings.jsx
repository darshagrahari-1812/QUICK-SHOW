import React, { useEffect, useState } from 'react'
import Loading from '../components/Loading'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/timeFormat'
import { dateFormat } from '../lib/dateFormat'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { Ticket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY || '$'
  const { axios, getToken, user, image_base_url } = useAppContext()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [payingId, setPayingId] = useState(null)

  const getPosterUrl = (movie) => {
    const rawPath = movie?.poster_path || movie?.backdrop_path || ''
    if (!rawPath) return ''
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath
    return (image_base_url || 'https://image.tmdb.org/t/p/original') + rawPath
  }

  const getMyBookings = async () => {
    try {
      setIsLoading(true)
      const token = await getToken()
      const { data } = await axios.get('/api/user/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        setBookings(data.bookings || [])
      } else {
        toast.error(data.message || 'Failed to fetch bookings')
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error)
      toast.error(error.response?.data?.message || 'Error fetching bookings')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayBooking = async (bookingId) => {
    try {
      setPayingId(bookingId)
      const token = await getToken()
      const { data } = await axios.post(
        '/api/booking/pay',
        { bookingId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.message || 'Payment initiation failed')
        setPayingId(null)
      }
    } catch (error) {
      console.error('Pay booking error:', error)
      toast.error(error.response?.data?.message || 'Error processing payment')
      setPayingId(null)
    }
  }

  useEffect(() => {
    if (user) {
      getMyBookings()
    } else {
      setIsLoading(false)
    }
  }, [user])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top='100px' left='100px' />
      <div>
        <BlurCircle bottom='0px' left='600px' />
      </div>

      <h1 className='text-2xl font-semibold mb-6'>My Bookings</h1>

      {!user ? (
        <div className='flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto'>
          <div className='w-16 h-16 mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary'>
            <Ticket className='w-8 h-8' />
          </div>
          <h2 className='text-xl font-semibold mb-2 text-white'>Sign In Required</h2>
          <p className='text-gray-400 text-sm mb-6'>
            Please sign in to view and manage your movie bookings.
          </p>
        </div>
      ) : bookings.length > 0 ? (
        <div className='space-y-4'>
          {bookings.map((item, index) => {
            const seats = Array.isArray(item.bookedSeats)
              ? item.bookedSeats
              : Object.keys(item.bookedSeats || {})
            const movie = item.show?.movie
            const posterUrl = getPosterUrl(movie)

            return (
              <div
                key={item._id || index}
                className='flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 
                rounded-lg p-3 max-w-3xl hover:border-primary/40 transition-colors'
              >
                <div className='flex flex-col md:flex-row gap-4'>
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movie?.title || 'Movie'}
                      className='md:w-44 md:h-28 aspect-video object-cover object-center rounded'
                    />
                  ) : (
                    <div className='md:w-44 md:h-28 aspect-video bg-primary/20 rounded flex items-center justify-center text-gray-400 text-xs'>
                      No Poster
                    </div>
                  )}
                  <div className='flex flex-col justify-between py-1'>
                    <div>
                      <p className='text-lg font-semibold text-white'>
                        {movie?.title || 'Unknown Movie'}
                      </p>
                      {movie?.runtime && (
                        <p className='text-gray-400 text-sm'>
                          {timeFormat(movie.runtime)}
                        </p>
                      )}
                    </div>
                    <p className='text-gray-400 text-sm mt-2'>
                      {item.show?.showDateTime ? dateFormat(item.show.showDateTime) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className='flex flex-col md:items-end md:text-right justify-between p-2 mt-4 md:mt-0'>
                  <div className='flex items-center gap-4'>
                    <p className='text-2xl font-semibold text-white'>
                      {currency} {item.amount}
                    </p>
                    {!item.isPaid ? (
                      <button
                        onClick={() => handlePayBooking(item._id)}
                        disabled={payingId === item._id}
                        className='bg-primary hover:bg-primary-dull text-white px-4 py-1.5 text-sm rounded-full font-medium transition cursor-pointer active:scale-95 shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        {payingId === item._id ? 'Redirecting...' : 'Pay Now'}
                      </button>
                    ) : (
                      <span className='bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 text-xs rounded-full font-medium'>
                        Paid
                      </span>
                    )}
                  </div>
                  <div className='text-sm mt-3 text-gray-300'>
                    <p>
                      <span className='text-gray-400'>Total Tickets:</span> {seats.length}
                    </p>
                    <p>
                      <span className='text-gray-400'>Seat Number:</span> {seats.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto'>
          <div className='w-16 h-16 mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary'>
            <Ticket className='w-8 h-8' />
          </div>
          <h2 className='text-xl font-semibold mb-2 text-white'>No Bookings Found</h2>
          <p className='text-gray-400 text-sm mb-6'>
            You haven't booked any movie tickets yet. Explore the latest shows and book your favorite seats!
          </p>
          <button
            onClick={() => navigate('/movies')}
            className='bg-primary hover:bg-primary-dull text-white px-6 py-2.5 rounded-full font-medium transition cursor-pointer text-sm active:scale-95'
          >
            Browse Movies
          </button>
        </div>
      )}
    </div>
  )
}

export default MyBookings