import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors'; // Import the CORS middleware
import path from 'path';
import { fileURLToPath } from 'url';
import './config/passport-setup.js'; // Import the passport setup
import userRouter from './routes/users';
import authRoutes from './routes/auth.routes.js';
import jobsRoutes from './server/routes/jobs.routes.js';
import applicationsRoutes from './server/routes/applications.routes.js';
import testRoutes from './server/routes/test.routes.js';
import scoresRoutes from './server/routes/scores.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// CORS setup: Allow requests from your frontend (e.g., React)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow both ports for React frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true // Allow cookies or other credentials to be sent
}));

// Middleware
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/users', userRouter);
app.use('/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/scores', scoresRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

server.listen(process.env.PORT || 5001, () => {
  console.log(`Server running on port ${process.env.PORT || 5001}`);
});

export default app;
