import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import 'dotenv/config';
import connectDB from './config/db.js';
import { functions, inngest } from './inngest/index.js';
import { serve } from "inngest/express";

const app=express();

const port = 3000;
await connectDB();

//Middleware
app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())

//API Routes
app.use('/api/inngest', serve({
    client: inngest,
    functions
}))


app.get('/',(req,res)=> res.send('Server is Live!'))
app.listen(port,()=> {console.log(`Server listening at http://localhost:${port}`);
})