import "dotenv/config";
import axios from "axios";
import https from "https";

import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

// =====================================================
// TMDB HTTPS Agent
// =====================================================

const httpsAgent = new https.Agent({
    keepAlive: false,
});

// =====================================================
// TMDB Axios Instance
// =====================================================

const tmdb = axios.create({
    baseURL: "https://api.themoviedb.org/3",
    timeout: 20000,
    httpsAgent,
    headers: {
        accept: "application/json",
    },
});

// =====================================================
// TMDB Authorization
// =====================================================

tmdb.interceptors.request.use((config) => {
    if (process.env.TMDB_API_KEY) {
        config.headers.Authorization =
            `Bearer ${process.env.TMDB_API_KEY}`;
    }

    return config;
});

// =====================================================
// Helper: TMDB Request With Retry
// =====================================================

const tmdbRequest = async (config, retries = 3) => {
    try {
        return await tmdb.request(config);
    } catch (error) {

        const retryableErrors = [
            "ECONNRESET",
            "ETIMEDOUT",
            "ECONNABORTED",
            "EAI_AGAIN",
        ];

        const isRetryable =
            retryableErrors.includes(error.code) ||
            error.response?.status >= 500;

        if (isRetryable && retries > 0) {

            console.log(
                `TMDB request failed (${error.code || error.response?.status}). Retrying...`
            );

            await new Promise((resolve) =>
                setTimeout(resolve, 1000)
            );

            return tmdbRequest(
                config,
                retries - 1
            );
        }

        throw error;
    }
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

        return res.status(500).json({
            success: false,
            message:
                error.response?.data?.status_message ||
                error.message,
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

                _id: movieId,

                title:
                    movieApiData.title || "",

                overview:
                    movieApiData.overview || "",

                poster_path:
                    movieApiData.poster_path || "",

                backdrop_path:
                    movieApiData.backdrop_path || "",

                genres:
                    movieApiData.genres || [],

                casts:
                    movieCreditsData.cast || [],

                release_date:
                    movieApiData.release_date || "",

                original_language:
                    movieApiData.original_language || "",

                tagline:
                    movieApiData.tagline || "",

                vote_average:
                    movieApiData.vote_average || 0,

                runtime:
                    movieApiData.runtime || 0,
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