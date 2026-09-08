import { Heart, PlayCircleIcon, StarIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dummyShowsData, dummyDateTimeData } from '../assets/assets'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/timeFormat'
import DateSelect from '../components/DateSelect'
import MovieCard from '../components/MovieCard'
import Loading from '../components/Loading'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const MoviesDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [show, setShow] = useState(null)
  const { axios, user, favoriteMovies = [], toggleFavorite, image_base_url, shows = [] } = useAppContext()

  const isFavorite = favoriteMovies?.some(m => String(m._id) === String(id))

  const handleFavoriteToggle = () => {
    if (show?.movie) {
      toggleFavorite(show.movie)
    }
  }

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`)
      if (data.success && data.movie) {
        setShow({
          movie: data.movie,
          dateTime: data.dateTime || {}
        })
        return
      }
    } catch (error) {
      console.error('Error fetching show from API:', error)
    }

    const dummyShow = dummyShowsData.find(s => String(s._id) === String(id))
    if (dummyShow) {
      setShow({
        movie: dummyShow,
        dateTime: dummyDateTimeData
      })
    }
  }

  useEffect(() => {
    getShow()
  }, [id])

  const posterSrc = show?.movie?.poster_path
    ? (show.movie.poster_path.startsWith('http')
        ? show.movie.poster_path
        : (image_base_url || 'https://image.tmdb.org/t/p/original') + show.movie.poster_path)
    : ''

  const displaySimilar = shows && shows.length > 0 ? shows.slice(0, 4) : dummyShowsData.slice(0, 4)

  return show ? (
    <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>
      <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
        <img
          src={posterSrc}
          alt={show.movie.title || ''}
          className='max-md:mx-auto rounded-xl h-104 max-w-70 object-cover'
        />
        <div className='relative flex flex-col gap-3'>
          <BlurCircle top="-100px" left="-100px"/>
          <p className='text-primary'>ENGLISH</p>
          <h1 className='text-4xl font-semibold max-w-96 text-balance'>{show.movie.title}</h1>

          <div className='flex items-center gap-2 text-gray-300'>
            <StarIcon className='w-5 h-5 text-primary fill-primary'/>
            {show.movie.vote_average ? show.movie.vote_average.toFixed(1) : '0.0'} User Rating
          </div>
          <p className='text-gray-400 mt-2 text-sm leading-tight max-w-xl'>
            {show.movie.overview}
          </p>
          <p>
            {timeFormat(show.movie.runtime || 0)} • {show.movie.genres?.map(genre => genre.name).join(", ")} • {show.movie.release_date ? show.movie.release_date.split("-")[0] : ''}
          </p>
          <div className='flex items-center flex-wrap gap-4 mt-4'>
            <button className='flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95'>
              <PlayCircleIcon className='w-5 h-5 '/>
              Watch Trailer
            </button>
            <a href='#dateSelect' className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95'>
              Buy Tickets
            </a>
            <button
              onClick={handleFavoriteToggle}
              className='bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95'
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-primary fill-primary' : ''}`}/>
            </button>
          </div>
        </div>
      </div> 

      <p className='text-lg font-medium mt-20 '>Your Favorite Cast</p>
      <div className='overflow-x-auto no-scrollbar mt-8 pb-4 '>
        <div className='flex items-center gap-4 w-max px-4'>
          {show.movie.casts?.slice(0, 12).map((cast, index) => {
            const castSrc = cast.profile_path
              ? (cast.profile_path.startsWith('http')
                  ? cast.profile_path
                  : (image_base_url || 'https://image.tmdb.org/t/p/original') + cast.profile_path)
              : ''
            return (
              <div key={index} className='flex flex-col items-center text-center'>
                <img
                  src={castSrc}
                  alt={cast.name}
                  className='rounded-full h-20 md:h-20 aspect-square object-cover'
                />
                <p className='font-medium text-xs mt-3'>{cast.name}</p>
              </div>
            )
          })}
        </div>
      </div>

      <DateSelect dateTime={show.dateTime} id={id}/>

      <p className='text-lg font-medium mt-20 mb-8'>You May Also Like</p>
      <div className='flex flex-wrap max-sm:justify-center gap-8'>
        {displaySimilar.map((movie, index) => (
          <MovieCard key={movie._id || index} movie={movie}/>
        ))}
      </div>

      <div onClick={() => { navigate('/movies'); scrollTo(0, 0) }} className='flex justify-center mt-20'>
        <button className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer'>
          Show more
        </button>
      </div>

    </div>
  ) : <Loading/>
}

export default MoviesDetails