import React, { useEffect, useState } from 'react'
import { dummyBookingData } from '../../assets/assets'
import Loading from '../../components/Loading'
import Title from '../../components/admin/Title'
import { dateFormat } from '../../lib/dateFormat'

const ListBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY

  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const getAllBookings = async () => {
    try {
      setBookings(dummyBookingData)
      setIsLoading(false)
    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getAllBookings()
  }, [])

  return !isLoading ? (
    <>
      <Title text1="List " text2="Bookings" />

      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">

          {/* TABLE HEADER */}
          <thead>
            <tr className="bg-primary/20 text-left text-white">

              <th className="p-2 pl-5 font-medium">
                User Name
              </th>

              <th className="p-2 pl-5 font-medium">
                Movie Name
              </th>

              <th className="p-2 pl-5 font-medium">
                Show Time
              </th>

              <th className="p-2 pl-5 font-medium">
                Seats
              </th>

              <th className="p-2 pl-5 font-medium">
                Amount
              </th>

            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="text-sm font-light">

            {bookings.map((item, index) => (

              <tr
                key={index}
                className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
              >

                {/* USER NAME */}
                <td className="p-2 pl-5 min-w-45">
                  {item.user?.name || 'Unknown User'}
                </td>

                {/* MOVIE NAME */}
                <td className="p-2 pl-5 min-w-55">
                  {item.show?.movie?.title || 'Unknown Movie'}
                </td>

                {/* SHOW TIME */}
                <td className="p-2 pl-5 min-w-55">
                  {item.show?.showDateTime
                    ? dateFormat(item.show.showDateTime)
                    : 'N/A'}
                </td>

                {/* SEATS */}
                <td className="p-2 pl-5 min-w-32">
                  {Array.isArray(item.bookedSeats)
                    ? item.bookedSeats.join(', ')
                    : Object.keys(item.bookedSeats || {}).join(', ')}
                </td>

                {/* AMOUNT */}
                <td className="p-2 pl-5 min-w-24">
                  {currency} {item.amount}
                </td>

              </tr>

            ))}

          </tbody>

        </table>
      </div>
    </>
  ) : (
    <Loading />
  )
}

export default ListBookings