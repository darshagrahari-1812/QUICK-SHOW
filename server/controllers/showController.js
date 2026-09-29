import "dotenv/config";
import axios from "axios";
import https from "https";

import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

// =====================================================
// TMDB Request with Native Fetch, Retry & Backoff
// =====================================================

const tmdbRequest = async ({ method = "GET", url, params = {} }, retries = 5, delay = 400) => {
    const key = process.env.TMDB_API_KEY?.trim() || "";
    const headers = {
        Accept: "application/json",
        "User-Agent": "QuickShow/1.0",
    };

    const fullUrl = url.startsWith("http")
        ? url
        : `https://api.themoviedb.org/3${url.startsWith("/") ? "" : "/"}${url}`;
    const urlObj = new URL(fullUrl);

    // Apply any query params
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
            urlObj.searchParams.set(k, String(v));
        }
    }

    // Support both JWT v4 Read Access Token (starts with eyJ) and v3 API key
    if (key) {
        if (key.startsWith("eyJ")) {
            headers["Authorization"] = `Bearer ${key}`;
        } else {
            urlObj.searchParams.set("api_key", key);
        }
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(urlObj.toString(), {
                method,
                headers,
            });

            if (res.ok) {
                const data = await res.json();
                return { data };
            }

            // Don't retry client errors like 401 or 404
            if (res.status === 404 || res.status === 401 || res.status === 403) {
                const errData = await res.json().catch(() => ({}));
                const error = new Error(
                    errData.status_message || `TMDB request failed with status ${res.status}`
                );
                error.response = { status: res.status, data: errData };
                throw error;
            }

            console.warn(
                `TMDB attempt ${attempt} returned status ${res.status}. Retrying in ${delay}ms...`
            );
        } catch (err) {
            if (err.response && [401, 403, 404].includes(err.response.status)) {
                throw err;
            }

            if (attempt === retries) {
                console.error(`All ${retries} attempts to TMDB failed: ${err.message}`);
                throw err;
            }

            console.log(
                `TMDB connection issue (${err.code || err.message}). Retrying attempt ${attempt + 1}/${retries} in ${delay}ms...`
            );
            await new Promise((r) => setTimeout(r, delay));
            delay = Math.round(delay * 1.5);
        }
    }

    throw new Error("TMDB request failed after maximum retries");
};

// =====================================================
// API: Get Now Playing Movies
// GET /api/show/now-playing
// =====================================================

export const getNowPlayingMovies = async (req, res) => {

    try {

        console.log(
            "TMDB TOKEN EXISTS:",
            !!process.env.TMDB_API_KEY
        );

        console.log(
            "TMDB TOKEN LENGTH:",
            process.env.TMDB_API_KEY?.length
        );

        const { data } = await tmdbRequest({
            method: "GET",
            url: "/movie/now_playing",
        });

        return res.status(200).json({
            success: true,
            movies: data.results,
        });

    } catch (error) {

        console.error("=================================");
        console.error("TMDB NOW PLAYING ERROR");

        console.error(
            "Code:",
            error.code
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "Response:",
            error.response?.data
        );

        console.error("=================================");

        // Graceful fallback to existing database movies if TMDB has temporary network issues
        try {
            const fallbackMovies = await Movie.find({});
            if (fallbackMovies && fallbackMovies.length > 0) {
                console.log("TMDB failed; returning fallback movies from database.");
                return res.status(200).json({
                    success: true,
                    movies: fallbackMovies,
                    isFallback: true,
                });
            }
        } catch (dbError) {
            console.error("Database fallback error:", dbError.message);
        }

        return res.status(500).json({
            success: false,
            message:
                error.response?.data?.status_message ||
                error.message,
        });
    }
};

// =====================================================
// API: Search Movies from TMDB
// GET /api/show/search-movies?query=...
// =====================================================

export const searchMovies = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || !query.trim()) {
            return res.status(400).json({ success: false, message: "Search query is required" });
        }

        const { data } = await tmdbRequest({
            method: "GET",
            url: "/search/movie",
            params: {
                query: query.trim(),
                include_adult: false,
                page: 1,
            },
        });

        return res.status(200).json({
            success: true,
            movies: data.results || [],
        });
    } catch (error) {
        console.error("TMDB search movies error:", error);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.status_message || error.message || "Failed to search movies",
        });
    }
};

// =====================================================
// API: Discover Movies by Category or Genre
// GET /api/show/discover?genre=...&category=...
// =====================================================

export const getDiscoverMovies = async (req, res) => {
    try {
        const { genre, category = "now_playing" } = req.query;

        let url = `/movie/${category}`;
        let params = { page: 1 };

        if (genre) {
            url = "/discover/movie";
            params = {
                with_genres: genre,
                sort_by: "popularity.desc",
                include_adult: false,
                page: 1,
            };
        }

        const { data } = await tmdbRequest({
            method: "GET",
            url,
            params,
        });

        return res.status(200).json({
            success: true,
            movies: data.results || [],
        });
    } catch (error) {
        console.error("TMDB discover movies error:", error);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.status_message || error.message || "Failed to fetch movies",
        });
    }
};

// =====================================================
// API: Get Movie Genres
// GET /api/show/genres
// =====================================================

export const getGenres = async (req, res) => {
    try {
        const { data } = await tmdbRequest({
            method: "GET",
            url: "/genre/movie/list",
        });

        return res.status(200).json({
            success: true,
            genres: data.genres || [],
        });
    } catch (error) {
        console.error("TMDB get genres error:", error);
        const fallbackGenres = [
            { id: 28, name: "Action" },
            { id: 12, name: "Adventure" },
            { id: 16, name: "Animation" },
            { id: 35, name: "Comedy" },
            { id: 80, name: "Crime" },
            { id: 18, name: "Drama" },
            { id: 14, name: "Fantasy" },
            { id: 27, name: "Horror" },
            { id: 10749, name: "Romance" },
            { id: 878, name: "Sci-Fi" },
            { id: 53, name: "Thriller" },
        ];
        return res.status(200).json({
            success: true,
            genres: fallbackGenres,
        });
    }
};

// =====================================================
// API: Add Show
// POST /api/show/add
// =====================================================

export const addShow = async (req, res) => {

    try {

        // ---------------------------------------------
        // Get data from request
        // ---------------------------------------------

        const {
            movieId,
            showsInput,
            showPrice,
        } = req.body || {};

        console.log(
            "================================="
        );

        console.log(
            "ADD SHOW REQUEST BODY:"
        );

        console.log(
            JSON.stringify(req.body, null, 2)
        );

        console.log(
            "================================="
        );

        // ---------------------------------------------
        // Validate movieId
        // ---------------------------------------------

        if (!movieId) {

            return res.status(400).json({
                success: false,
                message: "movieId is required",
            });
        }

        // ---------------------------------------------
        // Validate showsInput
        // ---------------------------------------------

        if (!showsInput) {

            return res.status(400).json({
                success: false,
                message: "showsInput is required",
            });
        }

        if (!Array.isArray(showsInput)) {

            return res.status(400).json({
                success: false,
                message:
                    "showsInput must be an array",
            });
        }

        // ---------------------------------------------
        // Validate showPrice
        // ---------------------------------------------

        if (
            showPrice === undefined ||
            showPrice === null ||
            showPrice === ""
        ) {

            return res.status(400).json({
                success: false,
                message: "showPrice is required",
            });
        }

        const price = Number(showPrice);

        if (isNaN(price) || price < 0) {

            return res.status(400).json({
                success: false,
                message:
                    "showPrice must be a valid number",
            });
        }

        // ---------------------------------------------
        // Find Movie in Database
        // ---------------------------------------------

        let movie = await Movie.findById(movieId);

        // ---------------------------------------------
        // Movie not found
        // Fetch from TMDB
        // ---------------------------------------------

        if (!movie) {

            console.log(
                `Movie ${movieId} not found. Fetching from TMDB...`
            );

            const [
                movieDetailsResponse,
                movieCreditsResponse,
            ] = await Promise.all([

                // Movie details
                tmdbRequest({
                    method: "GET",
                    url: `/movie/${movieId}`,
                }),

                // Movie credits
                tmdbRequest({
                    method: "GET",
                    url: `/movie/${movieId}/credits`,
                }),

            ]);

            const movieApiData =
                movieDetailsResponse.data;

            const movieCreditsData =
                movieCreditsResponse.data;

            // -----------------------------------------
            // Create Movie Object
            // -----------------------------------------

            const movieDetails = {

                _id: String(movieId),

                title:
                    movieApiData.title || "Untitled",

                overview:
                    movieApiData.overview || "No overview available.",

                poster_path:
                    movieApiData.poster_path || movieApiData.backdrop_path || "",

                backdrop_path:
                    movieApiData.backdrop_path || movieApiData.poster_path || "",

                genres:
                    Array.isArray(movieApiData.genres) && movieApiData.genres.length > 0
                        ? movieApiData.genres
                        : [{ id: 1, name: "General" }],

                casts:
                    Array.isArray(movieCreditsData.cast)
                        ? movieCreditsData.cast
                        : [],

                release_date:
                    movieApiData.release_date || new Date().toISOString().split("T")[0],

                original_language:
                    movieApiData.original_language || "en",

                tagline:
                    movieApiData.tagline || "",

                vote_average:
                    typeof movieApiData.vote_average === "number"
                        ? movieApiData.vote_average
                        : 0,

                runtime:
                    Number(movieApiData.runtime) || 120,
            };

            // -----------------------------------------
            // Save Movie
            // -----------------------------------------

            movie =
                await Movie.create(movieDetails);

            console.log(
                "Movie saved:",
                movie.title
            );
        }

        // =====================================================
        // Create Shows
        // =====================================================

        const showsToCreate = [];

        for (const show of showsInput) {

            // -----------------------------------------
            // Get date and time
            // -----------------------------------------

            const showDate = show?.date;
            const time = show?.time;

            // -----------------------------------------
            // Validate date
            // -----------------------------------------

            if (!showDate) {
                console.log(
                    "Skipping show: date missing"
                );

                continue;
            }

            // -----------------------------------------
            // Validate time
            // -----------------------------------------

            if (!time) {
                console.log(
                    "Skipping show: time missing"
                );

                continue;
            }

            // -----------------------------------------
            // Create DateTime
            // -----------------------------------------

            const dateTimeString =
                `${showDate}T${time}:00`;

            const showDateTime =
                new Date(dateTimeString);

            console.log(
                "Creating show:",
                dateTimeString
            );

            // -----------------------------------------
            // Validate DateTime
            // -----------------------------------------

            if (isNaN(showDateTime.getTime())) {

                console.log(
                    "Invalid date:",
                    dateTimeString
                );

                continue;
            }

            // -----------------------------------------
            // Don't allow past shows
            // -----------------------------------------

            if (showDateTime <= new Date()) {

                console.log(
                    "Skipping past show:",
                    dateTimeString
                );

                continue;
            }

            // -----------------------------------------
            // Add show
            // -----------------------------------------

            showsToCreate.push({

                movie: movieId,

                showDateTime: showDateTime,

                showPrice: price,

                occupiedSeats: {},
            });
        }

        // =====================================================
        // Check Valid Shows
        // =====================================================

        console.log(
            "SHOWS TO CREATE:",
            showsToCreate
        );

        if (showsToCreate.length === 0) {

            return res.status(400).json({
                success: false,
                message:
                    "No valid show timings provided",
            });
        }

        // =====================================================
        // Insert Shows
        // =====================================================

        const createdShows =
            await Show.insertMany(
                showsToCreate
            );

        // =====================================================
        // Success Response
        // =====================================================

        return res.status(201).json({

            success: true,

            message:
                "Show added successfully",

            movie,

            shows: createdShows,
        });

    } catch (error) {

        // =====================================================
        // Error Handling
        // =====================================================

        console.error(
            "================================="
        );

        console.error(
            "ADD SHOW ERROR"
        );

        console.error(
            "Code:",
            error.code
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "Response:",
            error.response?.data
        );

        console.error(
            "Full Error:",
            error
        );

        console.error(
            "================================="
        );

        return res.status(500).json({

            success: false,

            message:
                error.response?.data?.status_message ||
                error.message,
        });
    }
};

// =====================================================
// API: Get All Shows
// GET /api/show/all
// =====================================================

export const getShows = async (req, res) => {

    try {

        const shows = await Show.find({
            showDateTime: {
                $gte: new Date(),
            },
        })
            .populate("movie")
            .sort({
                showDateTime: 1,
            });

        // ---------------------------------------------
        // Filter unique movies
        // ---------------------------------------------

        const uniqueMovies = [];

        const seenIds = new Set();

        for (const show of shows) {

            if (
                show.movie &&
                !seenIds.has(
                    String(show.movie._id)
                )
            ) {

                seenIds.add(
                    String(show.movie._id)
                );

                uniqueMovies.push(
                    show.movie
                );
            }
        }

        return res.json({

            success: true,

            shows: uniqueMovies,
        });

    } catch (error) {

        console.error(
            "GET SHOWS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message,
        });
    }
};

// =====================================================
// API: Get Single Show
// GET /api/show/:movieId
// =====================================================

export const getShow = async (req, res) => {

    try {

        const {
            movieId,
        } = req.params;

        // ---------------------------------------------
        // Find shows
        // ---------------------------------------------

        const shows = await Show.find({
            movie: movieId,

            showDateTime: {
                $gte: new Date(),
            },
        });

        // ---------------------------------------------
        // Find movie
        // ---------------------------------------------

        const movie =
            await Movie.findById(movieId);

        // ---------------------------------------------
        // Create Date-Time Object
        // ---------------------------------------------

        const dateTime = {};

        shows.forEach((show) => {

            const date =
                show.showDateTime
                    .toISOString()
                    .split("T")[0];

            if (!dateTime[date]) {

                dateTime[date] = [];
            }

            dateTime[date].push({

                time: show.showDateTime,

                showId: show._id,
            });
        });

        // ---------------------------------------------
        // Response
        // ---------------------------------------------

        res.json({

            success: true,

            movie,

            dateTime,
        });

    } catch (error) {

        console.error(
            "GET SHOW ERROR:",
            error
        );

        res.json({

            success: false,

            message: error.message,
        });
    }
};