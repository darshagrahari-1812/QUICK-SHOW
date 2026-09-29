import React, { useEffect, useState } from 'react';
import {
  CheckIcon,
  StarIcon,
  Loader2,
  Search,
  Sparkles,
  Filter,
  X,
  Film,
  Calendar,
  DollarSign,
  Trash2,
  TrendingUp,
  Clapperboard,
  Clock
} from 'lucide-react';
import Title from '../../components/admin/Title';
import Loading from '../../components/Loading';
import { kConverter } from '../../lib/kConverter';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'now_playing', label: 'Now Playing', icon: Clapperboard },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
  { id: 'top_rated', label: 'Top Rated', icon: StarIcon },
  { id: 'upcoming', label: 'Upcoming', icon: Clock },
];

const AddShows = () => {
  const { axios, getToken, image_base_url } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY || '$';
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('now_playing');
  const [activeGenre, setActiveGenre] = useState(null); // null means all

  // Selection & Form state
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [showPrice, setShowPrice] = useState('');

  // Fetch Genres
  const fetchGenresList = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/show/genres', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && Array.isArray(data.genres)) {
        setGenres(data.genres);
      }
    } catch (err) {
      console.warn('Could not load genres:', err);
    }
  };

  // Fetch Movies by Category / Genre
  const fetchMoviesList = async (category = activeCategory, genre = activeGenre) => {
    try {
      setLoading(true);
      const token = await getToken();
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (genre) params.append('genre', genre);

      const { data } = await axios.get(`/api/show/discover?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success && Array.isArray(data.movies)) {
        setMovies(data.movies);
      } else {
        // Fallback to now-playing
        const { data: fbData } = await axios.get('/api/show/now-playing', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fbData.success && Array.isArray(fbData.movies)) {
          setMovies(fbData.movies);
        } else {
          toast.error(data.message || 'Failed to load movies');
        }
      }
    } catch (error) {
      console.warn('Discover endpoint not available, falling back to now-playing:', error);
      // Fallback to now-playing
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/show/now-playing', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success && Array.isArray(data.movies)) {
          setMovies(data.movies);
        }
      } catch (fbErr) {
        toast.error('Failed to load movies from TMDB');
      }
    } finally {
      setLoading(false);
    }
  };

  // Search Movies by Specific Title
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMoviesList(activeCategory, activeGenre);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(
        `/api/show/search-movies?query=${encodeURIComponent(searchQuery.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success && Array.isArray(data.movies)) {
        setMovies(data.movies);
        setActiveCategory('');
        setActiveGenre(null);
        if (data.movies.length === 0) {
          toast('No movies found for your search', { icon: '🔍' });
        }
      } else {
        toast.error(data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search movies error:', error);
      toast.error('Failed to search movies from TMDB');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveCategory('now_playing');
    setActiveGenre(null);
    fetchMoviesList('now_playing', null);
  };

  const handleCategoryChange = (catId) => {
    setSearchQuery('');
    setActiveCategory(catId);
    fetchMoviesList(catId, activeGenre);
  };

  const handleGenreChange = (genreId) => {
    setSearchQuery('');
    const newGenre = activeGenre === genreId ? null : genreId;
    setActiveGenre(newGenre);
    fetchMoviesList(activeCategory || 'popular', newGenre);
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
      const movieId = selectedMovie.id || selectedMovie._id;
      const { data } = await axios.post(
        '/api/show/add',
        {
          movieId: String(movieId),
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
    fetchGenresList();
    fetchMoviesList('now_playing', null);
  }, []);

  const getMoviePoster = (movie) => {
    const raw = movie.poster_path || movie.backdrop_path;
    if (!raw) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';
    if (raw.startsWith('http')) return raw;
    const base = image_base_url || 'https://image.tmdb.org/t/p/w500';
    return `${base}${raw}`;
  };

  return (
    <div className="max-w-6xl pb-16">
      <Title text1="Add" text2="Shows" />

      {/* SEARCH AND TASTE / GENRE CONTROLS */}
      <div className="mt-8 space-y-5 bg-gray-900/60 p-5 rounded-2xl border border-gray-800 backdrop-blur-sm">
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specific movie by title (e.g. Inception, Interstellar, Batman)..."
              className="w-full pl-10 pr-10 py-2.5 bg-black/50 border border-gray-700/80 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dull transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </form>

        {/* Categories (Now Playing, Popular, Top Rated, Upcoming) */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Discover Categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-black/40 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Movie Taste / Genres Filter */}
        {genres.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Filter className="w-3.5 h-3.5 text-primary" />
                <span>Filter by Taste / Genre</span>
              </div>
              {activeGenre && (
                <button
                  onClick={() => handleGenreChange(activeGenre)}
                  className="text-xs text-primary hover:underline"
                >
                  Reset genre filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => handleGenreChange(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  activeGenre === null
                    ? 'bg-primary/20 border border-primary text-primary'
                    : 'bg-black/30 text-gray-400 hover:text-gray-200 border border-gray-800'
                }`}
              >
                All Genres
              </button>
              {genres.map((g) => {
                const isActive = activeGenre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGenreChange(g.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-primary border border-primary text-white shadow'
                        : 'bg-black/30 text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SELECTED MOVIE BANNER */}
      {selectedMovie && (
        <div className="mt-8 p-4 bg-primary/10 border border-primary/40 rounded-2xl flex items-center gap-4 animate-in fade-in duration-300">
          <img
            src={getMoviePoster(selectedMovie)}
            alt={selectedMovie.title}
            className="w-16 h-24 object-cover rounded-lg shadow-md border border-primary/40 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary text-white rounded">
                Selected Film
              </span>
              <p className="text-gray-400 text-xs">{selectedMovie.release_date || 'N/A'}</p>
            </div>
            <h3 className="text-lg font-bold text-white truncate mt-1">{selectedMovie.title}</h3>
            <p className="text-gray-300 text-xs line-clamp-2 mt-0.5">
              {selectedMovie.overview || 'Ready to add showtimes and pricing.'}
            </p>
          </div>
          <button
            onClick={() => setSelectedMovie(null)}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-black/40 hover:bg-black/70 rounded-lg border border-gray-700 transition"
          >
            Change
          </button>
        </div>
      )}

      {/* MOVIES GRID / CAROUSEL SECTION */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-lg font-medium text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : activeGenre
              ? `Movies matching "${genres.find((g) => g.id === activeGenre)?.name || 'Genre'}"`
              : `${CATEGORIES.find((c) => c.id === activeCategory)?.label || 'Now Playing'} Movies`}
            <span className="text-xs font-normal text-gray-400">({movies.length} found)</span>
          </p>
        </div>

        {loading ? (
          <div className="py-16">
            <Loading />
          </div>
        ) : movies.length === 0 ? (
          <div className="p-10 text-center text-gray-400 bg-gray-900/40 rounded-2xl mt-4 border border-gray-800">
            <Film className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-base font-medium text-gray-300">No movies found</p>
            <p className="text-xs text-gray-500 mt-1">Try another search keyword or switch genres/categories.</p>
            <button
              onClick={handleClearSearch}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dull transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 mt-4">
            <div className="flex gap-4 w-max">
              {movies.map((movie) => {
                const movieId = movie.id || movie._id;
                const isSelected = selectedMovie && String(selectedMovie.id || selectedMovie._id) === String(movieId);
                return (
                  <div
                    key={movieId}
                    className="relative w-40 cursor-pointer group hover:-translate-y-1 transition duration-300"
                    onClick={() => {
                      setSelectedMovie(movie);
                      toast.success(`Selected "${movie.title}"`);
                    }}
                  >
                    <div
                      className={`relative rounded-xl overflow-hidden border-2 transition ${
                        isSelected
                          ? 'border-primary ring-4 ring-primary/40 shadow-xl'
                          : 'border-transparent group-hover:border-gray-700'
                      }`}
                    >
                      <img
                        src={getMoviePoster(movie)}
                        alt={movie.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';
                        }}
                        className="w-full h-56 object-cover brightness-90 group-hover:brightness-100 transition"
                      />
                      <div className="text-xs flex items-center justify-between p-2 bg-black/80 w-full absolute bottom-0 left-0 backdrop-blur-xs">
                        <p className="flex items-center gap-1 text-gray-300">
                          <StarIcon className="w-3.5 h-3.5 text-primary fill-primary" />
                          {typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : '0.0'}
                        </p>
                        <p className="text-gray-400 text-[11px]">
                          {kConverter(movie.vote_count || 0)} votes
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 rounded-full flex items-center justify-center bg-primary h-6 w-6 text-white shadow-lg ring-2 ring-black">
                        <CheckIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}

                    <p className="font-semibold truncate mt-2 text-sm text-white group-hover:text-primary transition">
                      {movie.title}
                    </p>
                    <p className="text-gray-400 text-xs">{movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SHOW PRICE INPUT */}
      <div className="mt-10 p-6 bg-gray-900/40 rounded-2xl border border-gray-800">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Set Pricing & Showtimes
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Show Ticket Price</label>
            <div className="flex items-center gap-2 border border-gray-700 px-3.5 py-2.5 rounded-xl bg-black/50 focus-within:border-primary transition">
              <span className="text-gray-400 text-sm font-medium">{currency}</span>
              <input
                min={0}
                type="number"
                value={showPrice}
                onChange={(e) => setShowPrice(e.target.value)}
                placeholder="e.g. 15"
                className="outline-none bg-transparent text-white w-full text-sm"
              />
            </div>
          </div>

          {/* Date & Time Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Add Date and Time</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
                className="outline-none rounded-xl border border-gray-700 px-3.5 py-2.5 bg-black/50 text-white text-sm flex-1 focus:border-primary transition"
              />
              <button
                type="button"
                onClick={handleDateTimeAdd}
                className="bg-primary hover:bg-primary-dull text-white px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition shadow-md shrink-0"
              >
                Add Time
              </button>
            </div>
          </div>
        </div>

        {/* DISPLAY SELECTED TIMES */}
        {Object.keys(dateTimeSelection).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Scheduled Slots:</h4>
            <div className="space-y-3">
              {Object.entries(dateTimeSelection).map(([date, times]) => (
                <div key={date} className="bg-black/30 p-3 rounded-xl border border-gray-800">
                  <div className="font-medium text-xs text-primary uppercase tracking-wider mb-2">{date}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {times.map((time) => (
                      <div
                        key={time}
                        className="border border-primary/40 bg-primary/10 px-2.5 py-1.5 flex items-center gap-2 rounded-lg"
                      >
                        <span className="text-white font-medium">{time}</span>
                        <Trash2
                          onClick={() => handleRemoveTime(date, time)}
                          className="w-3.5 h-3.5 text-red-400 hover:text-red-500 cursor-pointer transition"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          onClick={handleAddShow}
          disabled={submitting}
          className="bg-primary text-white px-8 py-3 mt-8 rounded-xl hover:bg-primary-dull transition-all cursor-pointer font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Adding Shows to Database...' : 'Publish Shows'}
        </button>
      </div>
    </div>
  );
};

export default AddShows;