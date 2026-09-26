import { StarIcon } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import timeFormat from '../lib/timeFormat'
import { useAppContext } from '../context/AppContext'

const MovieCard = ({ movie }) => {
  const navigate = useNavigate()
  const { image_base_url } = useAppContext()

  const handleClick = () => {
    navigate(`/movies/${movie._id}`)
    window.scrollTo(0, 0)
  }

  const baseUrl = image_base_url || 'https://image.tmdb.org/t/p/original'
  const rawPath = movie.backdrop_path || movie.poster_path
  const imageSrc = rawPath
    ? (rawPath.startsWith('http') ? rawPath : baseUrl + rawPath)
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'

  const releaseYear = movie.release_date && !isNaN(new Date(movie.release_date).getTime())
    ? new Date(movie.release_date).getFullYear()
    : '2025'

  const genreText = Array.isArray(movie.genres) && movie.genres.length > 0
    ? movie.genres.slice(0, 2).map(g => (typeof g === 'object' ? g.name : g)).join(' | ')
    : 'Action'

  return (
    <div className='flex flex-col justify-between p-3 bg-gray-800 rounded-2xl hover:-translate-y-1 transition duration-300 w-66'>

      {/* Movie Image */}
      <img
        onClick={handleClick}
        src={imageSrc}
        alt={movie.title || 'Movie'}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
        }}
        className='rounded-lg h-52 w-full object-cover object-right-bottom cursor-pointer'
      />

      {/* Movie Title */}
      <p className='font-semibold mt-2 truncate'>
        {movie.title || 'Untitled'}
      </p>

      {/* Movie Info */}
      <p className='text-sm text-gray-400 mt-2'>
        {releaseYear} • {genreText} • {movie.runtime ? timeFormat(movie.runtime) : '2h 00m'}
      </p>

      {/* Bottom Section */}
      <div className='flex items-center justify-between mt-4 pb-3'>

        {/* Buy Tickets Button */}
        <button
          onClick={handleClick}
          className='px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'
        >
          Buy Tickets
        </button>

        {/* Rating */}
        <p className='flex items-center gap-1 text-sm text-gray-400'>
          <StarIcon className='w-4 h-4 text-primary fill-primary' />
          {typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : '0.0'}
        </p>

      </div>

    </div>
  )
}

export default MovieCard