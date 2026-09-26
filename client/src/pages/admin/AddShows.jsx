import React, { useEffect, useState } from 'react';
import { CheckIcon, DeleteIcon, StarIcon, Loader2 } from 'lucide-react';
import Title from '../../components/admin/Title';
import Loading from '../../components/Loading';
import { kConverter } from '../../lib/kConverter';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AddShows = () => {
  const { axios, getToken, image_base_url } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY || '$';
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [showPrice, setShowPrice] = useState('');

  const fetchNowPlayingMovies = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/show/now-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success && Array.isArray(data.movies)) {
        setNowPlayingMovies(data.movies);
      } else {
        toast.error(data.message || 'Failed to load now playing movies');
      }
    } catch (error) {
      console.error('Error while fetching movies:', error);
      toast.error(error.response?.data?.message || 'Failed to load movies from TMDB');
    } finally {
      setLoading(false);
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;

    const [date, time] = dateTimeInput.split('T');
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      const times = prev[date] || [];

      if (!times.includes(time)) {
        return { ...prev, [date]: [...times, time] };
      }

      return prev;
    });
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const times = (prev[date] || []).filter((t) => t !== time);
      if (times.length === 0) {
        const copy = { ...prev };
        delete copy[date];
        return copy;
      }
      return { ...prev, [date]: times };
    });
  };

  const handleAddShow = async () => {
    if (!selectedMovie) {
      toast.error('Please select a movie');
      return;
    }

    if (!showPrice || isNaN(Number(showPrice)) || Number(showPrice) < 0) {
      toast.error('Please enter a valid show price');
      return;
    }

    const showsInput = Object.entries(dateTimeSelection).flatMap(([date, times]) =>
      times.map((time) => ({ date, time }))
    );

    if (showsInput.length === 0) {
      toast.error('Please add at least one date and time for the show');
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      const { data } = await axios.post(
        '/api/show/add',
        {
          movieId: String(selectedMovie),
          showPrice: Number(showPrice),
          showsInput,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        toast.success(data.message || 'Shows added successfully!');
        setSelectedMovie(null);
        setShowPrice('');
        setDateTimeSelection({});
        setDateTimeInput('');
      } else {
        toast.error(data.message || 'Failed to add show');
      }
    } catch (error) {
      console.error('Error adding show:', error);
      toast.error(error.response?.data?.message || 'Failed to add show');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchNowPlayingMovies();
  }, []);

  const getMoviePoster = (movie) => {
    const raw = movie.poster_path || movie.backdrop_path;
    if (!raw) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';
    if (raw.startsWith('http')) return raw;
    const base = image_base_url || 'https://image.tmdb.org/t/p/w500';
    return `${base}${raw}`;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Title text1="Add" text2="Shows" />
      <p className="mt-10 text-lg font-medium">Now Playing Movies</p>

      {nowPlayingMovies.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-gray-900/50 rounded-xl mt-4 border border-gray-800">
          <p>No movies available from TMDB currently.</p>
          <button
            onClick={fetchNowPlayingMovies}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dull transition"
          >
            Retry Fetching Movies
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="group flex flex-wrap gap-4 mt-4 w-max">
            {nowPlayingMovies.map((movie) => {
              const movieId = movie.id || movie._id;
              const isSelected = String(selectedMovie) === String(movieId);
              return (
                <div
                  key={movieId}
                  className="relative max-w-40 cursor-pointer hover:-translate-y-1 transition duration-300"
                  onClick={() => setSelectedMovie(movieId)}
                >
                  <div className={`relative rounded-lg overflow-hidden border-2 transition ${isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-transparent'}`}>
                    <img
                      src={getMoviePoster(movie)}
                      alt={movie.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';
                      }}
                      className="w-full h-56 object-cover brightness-90"
                    />
                    <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                      <p className="flex items-center gap-1 text-gray-400">
                        <StarIcon className="w-4 h-4 text-primary fill-primary" />
                        {typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : '0.0'}
                      </p>
                      <p className="text-gray-300 text-xs">
                        {kConverter(movie.vote_count || 0)} votes
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 rounded flex items-center justify-center bg-primary h-6 w-6 text-white shadow-lg">
                      <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                  )}

                  <p className="font-medium truncate mt-1 text-sm">{movie.title}</p>
                  <p className="text-gray-400 text-xs">{movie.release_date || 'N/A'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SHOW PRICE INPUT */}
      <div className="mt-8">
        <label className="block text-sm font-medium mb-2">Show Price</label>
        <div className="inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md bg-gray-900/40">
          <p className="text-gray-400 text-sm">{currency}</p>
          <input
            min={0}
            type="number"
            value={showPrice}
            onChange={(e) => setShowPrice(e.target.value)}
            placeholder="Enter show price"
            className="outline-none bg-transparent text-white"
          />
        </div>
      </div>

      {/* DATE TIME SELECTION */}
      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">Select Date and Time</label>
        <div className="inline-flex gap-5 border border-gray-600 p-1 pl-3 rounded-lg bg-gray-900/40">
          <input
            type="datetime-local"
            value={dateTimeInput}
            onChange={(e) => setDateTimeInput(e.target.value)}
            className="outline-none rounded-md bg-transparent text-white"
          />
          <button
            onClick={handleDateTimeAdd}
            className="bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary cursor-pointer transition"
          >
            Add Time
          </button>
        </div>
      </div>

      {/* DISPLAY SELECTED TIMES */}
      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">Selected Date-Time</h2>
          <ul className="space-y-3">
            {Object.entries(dateTimeSelection).map(([date, times]) => (
              <li key={date}>
                <div className="font-medium text-sm text-gray-300">{date}</div>
                <div className="flex flex-wrap gap-2 mt-1 text-sm">
                  {times.map((time) => (
                    <div
                      key={time}
                      className="border border-primary bg-primary/10 px-2 py-1 flex items-center rounded"
                    >
                      <span className="text-white">{time}</span>
                      <DeleteIcon
                        onClick={() => handleRemoveTime(date, time)}
                        width={15}
                        className="ml-2 text-red-400 hover:text-red-600 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        onClick={handleAddShow}
        disabled={submitting}
        className="bg-primary text-white px-8 py-2.5 mt-8 rounded hover:bg-primary/90 transition-all cursor-pointer font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? 'Adding Show...' : 'Add Show'}
      </button>
    </>
  );
};

export default AddShows;