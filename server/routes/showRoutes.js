import express from "express";

import {
    getNowPlayingMovies,
    searchMovies,
    getDiscoverMovies,
    getGenres,
    addShow,
    getShow,
    getShows
} from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

showRouter.get("/now-playing", protectAdmin, getNowPlayingMovies);
showRouter.get("/search-movies", protectAdmin, searchMovies);
showRouter.get("/discover", protectAdmin, getDiscoverMovies);
showRouter.get("/genres", protectAdmin, getGenres);

showRouter.post("/add", addShow);
showRouter.get("/all",getShows);
showRouter.get("/:movieId",getShow)

export default showRouter;