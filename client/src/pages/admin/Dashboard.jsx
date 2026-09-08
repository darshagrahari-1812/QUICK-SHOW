import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  UserIcon,
  StarIcon
} from "lucide-react";

import React, { useEffect, useState } from "react";

import { dummyDashboardData } from "../../assets/assets";
import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";
import { dateFormat } from "../../lib/dateFormat";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const Dashboard = () => {

  // ================= APP CONTEXT =================

  const {
    axios,
    getToken,
    user,
    image_base_url
  } = useAppContext();


  // ================= CURRENCY =================

  const currency = import.meta.env.VITE_CURRENCY;


  // ================= DASHBOARD DATA =================

  const [dashboardData, setDashboardData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeShows: [],
    totalUser: 0
  });


  // ================= LOADING =================

  const [loading, setLoading] = useState(true);


  // ================= DASHBOARD CARDS =================

  const dashboardCards = [
    {
      title: "Total Bookings",
      value: dashboardData.totalBookings,
      icon: ChartLineIcon
    },
    {
      title: "Total Revenue",
      value: currency + dashboardData.totalRevenue,
      icon: CircleDollarSignIcon
    },
    {
      title: "Active Shows",
      value: dashboardData.activeShows.length,
      icon: PlayCircleIcon
    },
    {
      title: "Total Users",
      value: dashboardData.totalUser,
      icon: UserIcon
    }
  ];


  // ================= FETCH DASHBOARD DATA =================

  const fetchDashboardData = async () => {

    try {

      setLoading(true);

      const token = await getToken();

      const { data } = await axios.get(
        "/api/admin/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );


      if (data.success) {

        setDashboardData(data.dashboardData);

      } else {

        toast.error(
          data.message || "Failed to fetch dashboard data"
        );

      }

    } catch (error) {

      console.error(
        "Dashboard error:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message ||
        "Error fetching dashboard data"
      );

    } finally {

      setLoading(false);

    }
  };


  // ================= USE EFFECT =================

  useEffect(() => {

    if (user) {
      fetchDashboardData();
    }

  }, [user]);


  // ================= LOADING =================

  if (loading) {
    return <Loading />;
  }


  // ================= UI =================

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


        <div className="group flex flex-wrap gap-4 w-full">

          {dashboardCards.map((card, index) => {

            const Icon = card.icon;

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
                  group-hover:not-hover:opacity-40
                  hover:-translate-y-1
                  transition
                  duration-300
                  cursor-pointer
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
            );

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

        <div
          className="
            group
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-4
          "
        >

          {dashboardData.activeShows.length > 0 ? (

            dashboardData.activeShows.map((show) => {

              const movie = show.movie;

              return (

                <div
                  key={show._id}
                  className="
                    bg-primary/10
                    border
                    border-primary/20
                    rounded-md
                    overflow-hidden
                    group-hover:not-hover:opacity-40
                    hover:-translate-y-1
                    transition
                    duration-300
                    cursor-pointer
                  "
                >

                  {/* ================= MOVIE POSTER ================= */}

                  <img
                    src={
                      movie?.poster_path
                        ? (movie.poster_path.startsWith('http')
                            ? movie.poster_path
                            : `https://image.tmdb.org/t/p/w1280${movie.poster_path}`)
                        : (movie?.backdrop_path?.startsWith('http')
                            ? movie.backdrop_path
                            : `https://image.tmdb.org/t/p/w1280${movie?.backdrop_path || ''}`)
                    }
                    alt={movie?.title || "Movie"}
                    className="w-full h-60 object-cover object-center"
                  />


                  {/* ================= MOVIE DETAILS ================= */}

                  <div className="p-3">

                    {/* Movie Title */}

                    <h3
                      className="
                        font-medium
                        text-sm
                        truncate
                      "
                    >
                      {movie?.title}
                    </h3>


                    {/* Price + Rating */}

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        mt-2
                      "
                    >

                      {/* Price */}

                      <p
                        className="
                          text-sm
                          font-medium
                        "
                      >
                        {currency}
                        {show.showPrice}
                      </p>


                      {/* Rating */}

                      <p
                        className="
                          flex
                          items-center
                          gap-1
                          text-xs
                          text-gray-400
                        "
                      >

                        <StarIcon
                          className="
                            w-3
                            h-3
                            text-primary
                            fill-primary
                          "
                        />

                        {movie?.vote_average?.toFixed(1)}

                      </p>

                    </div>


                    {/* Show Date */}

                    <p
                      className="
                        text-xs
                        text-gray-500
                        mt-2
                      "
                    >
                      {dateFormat(show.showDateTime)}
                    </p>

                  </div>

                </div>

              );

            })

          ) : (

            <p className="text-gray-400">
              No active shows available.
            </p>

          )}

        </div>

      </div>

    </div>
  );
};


export default Dashboard;