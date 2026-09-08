import express from 'express';
import { getFavorites, getUserBookings, syncUser, updateFavorite } from '../controllers/userController.js';

const userRouter = express.Router();
userRouter.post('/sync', syncUser);
userRouter.get('/bookings', getUserBookings);
userRouter.post('/update-favorite', updateFavorite);
userRouter.get('/favorites', getFavorites);

export default userRouter;
