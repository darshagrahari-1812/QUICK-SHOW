import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets, dummyDateTimeData, dummyShowsData } from '../assets/assets'
import Loading from '../components/Loading'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import isoTimeFormat from '../lib/isoTimeFormat'
import BlurCircle from '../components/BlurCircle'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'

const SeatLayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]]
  const { id, date } = useParams()
  const { axios, getToken, user } = useAppContext()

  const [selectedSeats, setSelectedSeats] = useState([])
  const [selectedTime, setSelectedTime] = useState(null)
  const [show, setShow] = useState(null)
  const [occupiedSeats, setOccupiedSeats] = useState([])
  const [isBooking, setIsBooking] = useState(false)
  const navigate = useNavigate()

  const getOccupiedSeats = async (showId) => {
    if (!showId) return
    try {
      const { data } = await axios.get(`/api/booking/seats/${showId}`)
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || [])
      }
    } catch (error) {
      console.error('Error fetching occupied seats:', error)
    }
  }

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`)
      if (data.success && data.movie) {
        const dateTimeData = data.dateTime || data.datetime || {}
        setShow({
          movie: data.movie,
          dateTime: dateTimeData
        })

        // Auto select first timing if available
        const timings = dateTimeData[date] || []
        if (timings.length > 0) {
          setSelectedTime(timings[0])
          if (timings[0]?.showId) {
            getOccupiedSeats(timings[0].showId)
          }
        }
        return
      }
    } catch (error) {
      console.error('Error fetching show in SeatLayout:', error)
    }

    const dummyShow = dummyShowsData.find(s => String(s._id) === String(id))
    if (dummyShow) {
      setShow({
        movie: dummyShow,
        dateTime: dummyDateTimeData
      })
      const timings = dummyDateTimeData[date] || []
      if (timings.length > 0) {
        setSelectedTime(timings[0])
        if (timings[0]?.showId) {
          getOccupiedSeats(timings[0].showId)
        }
      }
    }
  }

  const handleTimeSelect = (item) => {
    setSelectedTime(item)
    setSelectedSeats([])
    if (item?.showId) {
      getOccupiedSeats(item.showId)
    }
  }

  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast.error("Please select a show timing first")
    }
    if (occupiedSeats.includes(seatId)) {
      return toast.error(`Seat ${seatId} is already booked!`)
    }
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5) {
      return toast.error("You can only select up to 5 seats")
    }
    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(seat => seat !== seatId) : [...prev, seatId]
    )
  }

  const bookTickets = async () => {
    try {
      if (!user) return toast.error('Please login to proceed with booking')
      if (!selectedTime) return toast.error("Please select a show timing")
      if (!selectedSeats.length) return toast.error("Please select at least one seat")

      setIsBooking(true)
      const token = await getToken()
      const { data } = await axios.post(
        '/api/booking/create',
        {
          showId: selectedTime.showId,
          selectedSeats
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (data.success) {
        window.location.href = data.url
      } else {
        toast.error(data.message || 'Failed to complete booking')
        if (selectedTime?.showId) {
          getOccupiedSeats(selectedTime.showId)
        }
      }
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error.response?.data?.message || error.message || 'Error processing booking')
      if (selectedTime?.showId) {
        getOccupiedSeats(selectedTime.showId)
      }
    } finally {
      setIsBooking(false)
    }
  }

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`
          const isOccupied = occupiedSeats.includes(seatId)
          const isSelected = selectedSeats.includes(seatId)

          return (
            <button
              key={seatId}
              disabled={isOccupied}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border text-xs font-semibold transition-all duration-150 ${isOccupied
                ? 'bg-red-950/40 text-red-400 border-red-500/40 cursor-not-allowed opacity-60 line-through'
                : isSelected
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105'
                  : 'border-primary/60 text-gray-200 cursor-pointer hover:bg-primary/20 hover:scale-105'
                }`}
              title={isOccupied ? `Seat ${seatId} is already booked` : `Seat ${seatId}`}
            >
              {seatId}
            </button>
          )
        })}
      </div>
    </div>
  )

  useEffect(() => {
    getShow()
  }, [id, date])

  const availableTimings = (show?.dateTime || show?.datetime)?.[date] || []

  return show ? (
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50 gap-8'>
      {/* Available Timings */}
      <div className='w-full md:w-64 bg-primary/10 border border-primary/20 rounded-lg p-6 h-max md:sticky md:top-30'>
        <p className='text-lg font-semibold text-white'>
          Available Timings
        </p>

        <div className='mt-4 space-y-2'>
          {availableTimings.length > 0 ? (
            availableTimings.map((item) => {
              const isSelected = selectedTime?.time === item.time
              return (
                <div
                  key={item.time}
                  onClick={() => handleTimeSelect(item)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition ${isSelected
                    ? 'bg-primary text-white font-medium shadow-md shadow-primary/20'
                    : 'hover:bg-primary/20 text-gray-300'
                    }`}
                >
                  <ClockIcon className='w-4 h-4' />
                  <p className='text-sm'>
                    {isoTimeFormat(item.time)}
                  </p>
                </div>
              )
            })
          ) : (
            <p className='text-gray-400 text-sm'>No timings available for this date.</p>
          )}
        </div>
      </div>

      {/* Seats Layout */}
      <div className='relative flex-1 flex flex-col items-center'>
        <BlurCircle top='-100px' left='-100px' />
        <BlurCircle bottom='0' right='0' />
        <h1 className='text-2xl font-semibold mb-4 text-white'>Select Your Seat</h1>
        <img src={assets.screenImage} alt='screen' className='w-full max-w-lg' />
        <p className='text-gray-400 text-xs tracking-wider mb-6'>SCREEN SIDE</p>

        {/* Legend */}
        <div className='flex items-center gap-6 mb-8 text-xs text-gray-300'>
          <div className='flex items-center gap-2'>
            <span className='h-4 w-4 rounded border border-primary/60 bg-transparent inline-block'></span>
            <span>Available</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='h-4 w-4 rounded bg-primary border border-primary inline-block'></span>
            <span>Selected</span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='h-4 w-4 rounded bg-red-950/40 border border-red-500/40 text-red-400 text-[10px] flex items-center justify-center font-bold'>✕</span>
            <span>Occupied</span>
          </div>
        </div>

        {/* Seat Grid */}
        <div className='flex flex-col items-center text-xs text-gray-300'>
          <div className='grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6'>
            {groupRows[0].map(row => renderSeats(row))}
          </div>
          <div className='grid grid-cols-2 gap-11'>
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>
                {group.map(row => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Seats summary */}
        {selectedSeats.length > 0 && (
          <div className='mt-8 bg-primary/10 border border-primary/20 rounded-full px-6 py-2 text-sm text-gray-300'>
            Selected: <span className='text-primary font-bold'>{selectedSeats.join(', ')}</span> ({selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'})
          </div>
        )}

        <button
          onClick={bookTickets}
          disabled={isBooking || selectedSeats.length === 0}
          className={`flex items-center gap-2 mt-10 px-10 py-3.5 text-sm 
          bg-primary hover:bg-primary-dull transition rounded-full font-medium 
          cursor-pointer active:scale-95 text-white shadow-lg shadow-primary/25 ${isBooking || selectedSeats.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {isBooking ? 'Processing...' : 'Proceed to Checkout'}
          <ArrowRightIcon strokeWidth={3} className='w-4 h-4' />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  )
}

export default SeatLayout