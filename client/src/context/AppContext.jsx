import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios"
import { useAuth, useUser } from "@clerk/react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // or wherever your toast lib is

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL

export const AppContext = createContext()

export const AppProvider = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false)
    const [shows, setShows] = useState([]) // renamed for consistency
    const [favoriteMovies, setFavoriteMovies] = useState([])
    const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL
    const { user } = useUser()
    const { getToken } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const fetchIsAdmin = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/is-admin', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setIsAdmin(data.isAdmin)
            if (!data.isAdmin && (location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/admin'))) {
                navigate('/')
                toast.error('You are not authorized to access admin dashboard')
            }
        } catch (error) {
            console.error(error);
            setIsAdmin(false)
            if (location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/admin')) {
                navigate('/')
                toast.error('You are not authorized to access admin dashboard')
            }
        }
    }

    const fetchShows = async () => {
        try {
            const { data } = await axios.get('/api/show/all')
            if (data.success) {
                setShows(data.shows)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error);
        }
    }

    const fetchFavoriteMovies = async () => {
        try {
            const { data } = await axios.get('/api/user/favorites', {
                headers: { Authorization: `Bearer ${await getToken()}` }
            })
            if (data.success) {
                setFavoriteMovies(data.movies)
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        fetchShows()
    }, [])

    useEffect(() => {
        if (user) {
            fetchIsAdmin()
            fetchFavoriteMovies()
        }
    }, [user])

    const toggleFavorite = async (movie) => {
        if (!user) {
            toast.error('Please sign in to add to favorites')
            return
        }
        if (!movie || !movie._id) return

        const movieId = String(movie._id)
        const isFav = favoriteMovies.some(m => String(m._id) === movieId)

        // Optimistic UI update - instantly reflects in UI
        const previousFavorites = [...favoriteMovies]
        if (isFav) {
            setFavoriteMovies(prev => prev.filter(m => String(m._id) !== movieId))
        } else {
            setFavoriteMovies(prev => [...prev, movie])
        }

        try {
            const token = await getToken()
            const { data } = await axios.post('/api/user/update-favorite', { movieId }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.success) {
                toast.success(data.message || (isFav ? 'Removed from favorites' : 'Added to favorites'))
            } else {
                setFavoriteMovies(previousFavorites)
                toast.error(data.message || 'Failed to update favorite')
            }
        } catch (error) {
            console.error(error)
            setFavoriteMovies(previousFavorites)
            toast.error('Failed to update favorite')
        }
    }

    const value = {
        axios, fetchIsAdmin,
        user, getToken, navigate, isAdmin, shows,
        favoriteMovies, setFavoriteMovies, fetchFavoriteMovies, toggleFavorite, image_base_url
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = () => useContext(AppContext)