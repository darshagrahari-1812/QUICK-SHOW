import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  UserIcon,
  StarIcon
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { dummyDashboardData } from '../../assets/assets'
import Title from '../../components/admin/Title'
import Loading from '../../components/Loading'
import BlurCircle from '../../components/BlurCircle'
import { dateFormat } from '../../lib/dateFormat'

const Dashboard = () => {

  const currency = import.meta.env.VITE_CURRENCY

  const [dashboardData, setDashboardData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeShows: [],
    totalUser: 0
  })

  const [loading, setLoading] = useState(true)

  // Dashboard Cards
  const dashboardCards = [
    {
      title: 'Total Bookings',
      value: dashboardData.totalBookings,
      icon: ChartLineIcon
    },
    {
      title: 'Total Revenue',
      value: currency + dashboardData.totalRevenue,
      icon: CircleDollarSignIcon
    },
    {
      title: 'Active Shows',
      value: dashboardData.activeShows.length,
      icon: PlayCircleIcon
    },
    {
      title: 'Total Users',
      value: dashboardData.totalUser,
      icon: UserIcon
    }
  ]

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    setDashboardData(dummyDashboardData)
    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Loading
  if (loading) {
    return <Loading />
  }

  return (
    <div className="relative p-6">

      {/* ================= DASHBOARD TITLE ================= */}
      <Title
        text1="Admin "
        text2="Dashboard"
      />


      {/* ================= DASHBOARD CARDS ================= */}
      <div className="relative flex flex-wrap gap-4 mt-6">

        {/* Background Blur */}
        <BlurCircle
          top="-100px"
          left="0"
        />

        <div className="flex flex-wrap gap-4 w-full">

          {dashboardCards.map((card, index) => {

            const Icon = card.icon

            return (
              <div
                key={index}
                className="
                  flex
                  items-center
                  justify-between
                  px-4
                  py-3
                  bg-primary/10
                  border
                  border-primary/20
                  rounded-md
                  max-w-50
                  w-full
                "
              >

                {/* Card Content */}
                <div>

                  <h1 className="text-sm">
                    {card.title}
                  </h1>

                  <p className="text-xl font-medium mt-1">
                    {card.value}
                  </p>

                </div>


                {/* Card Icon */}
                <Icon className="w-6 h-6" />

              </div>
            )
          })}

        </div>

      </div>


      {/* ================= ACTIVE SHOWS ================= */}

      <div className="mt-10">

        {/* Section Title */}
        <h2 className="text-lg font-medium mb-5">
          Active Shows
        </h2>


        {/* Active Shows Grid */}
        <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-4
          gap-4
        ">

          {dashboardData.activeShows.map((show) => {

            const movie = show.movie

            return (

              <div
                key={show._id}
                className="
                  bg-primary/10
                  border
                  border-primary/20
                  rounded-md
                  overflow-hidden
                "
              >

                {/* ================= MOVIE POSTER ================= */}

                <img
                  src={movie.backdrop_path}
                  alt={movie.title}
                  className="
                    w-full
                    h-44
                    object-cover
                    object-center
                  "
                />


                {/* ================= MOVIE DETAILS ================= */}

                <div className="p-3">

                  {/* Movie Title */}
                  <h3 className="
                    font-medium
                    text-sm
                    truncate
                  ">
                    {movie.title}
                  </h3>


                  {/* Price + Rating */}
                  <div className="
                    flex
                    items-center
                    justify-between
                    mt-2
                  ">

                    {/* Price */}
                    <p className="
                      text-sm
                      font-medium
                    ">
                      {currency}{show.showPrice}
                    </p>


                    {/* Rating */}
                    <p className="
                      flex
                      items-center
                      gap-1
                      text-xs
                      text-gray-400
                    ">

                      <StarIcon
                        className="
                          w-3
                          h-3
                          text-primary
                          fill-primary
                        "
                      />

                      {movie.vote_average?.toFixed(1)}

                    </p>

                  </div>


                  {/* Show Date */}
                  <p className="
                    text-xs
                    text-gray-500
                    mt-2
                  ">
                    {dateFormat(show.showDateTime)}
                  </p>

                </div>

              </div>

            )
          })}

        </div>

      </div>

    </div>
  )
}

export default Dashboard