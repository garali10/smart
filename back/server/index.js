import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import departmentHeadRoutes from './routes/department-head.routes.js';
import hrRoutes from './routes/hr.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import jobRoutes from './routes/jobs.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import passport from 'passport';
import session from 'express-session'
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import testRoutes from './routes/test.routes.js';
import fs from 'fs';
import { dirname } from 'path';

// Import models
import './models/job.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify environment variables are loaded
console.log('Environment check:', {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV
});

// Verify JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

const app = express();

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
const profilePicturesDir = path.join(uploadsDir, 'profile-pictures');
const resumesDir = path.join(uploadsDir, 'resumes');

// Créer les dossiers s'ils n'existent pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir);
  console.log('Created profile-pictures directory');
}

if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir);
  console.log('Created resumes directory');
}

// Vérifier les permissions
try {
  fs.accessSync(profilePicturesDir, fs.constants.W_OK);
  console.log('Upload directory is writable');
} catch (err) {
  console.error('Upload directory is not writable:', err);
}

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(passport.initialize());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

// Configurer les dossiers statiques - mettre ceci AVANT les routes
const uploadsPath = path.join(__dirname, 'uploads');
app.use(['/api/uploads', '/uploads'], express.static(uploadsPath));

// Logger pour débugger les requêtes de fichiers
app.use(['/api/uploads', '/uploads'], (req, res, next) => {
  const relativePath = req.url;
  // Try all possible paths: direct path, profile-pictures, and resumes
  const fullPath = path.join(uploadsPath, relativePath);
  const profilePicPath = path.join(uploadsPath, 'profile-pictures', path.basename(relativePath));
  const resumePath = path.join(uploadsPath, 'resumes', path.basename(relativePath));
  
  const fileExists = fs.existsSync(fullPath) || fs.existsSync(profilePicPath) || fs.existsSync(resumePath);
  const actualPath = fs.existsSync(fullPath) 
    ? fullPath 
    : fs.existsSync(profilePicPath)
      ? profilePicPath
      : fs.existsSync(resumePath)
        ? resumePath
        : fullPath;
  
  console.log('Static file request details:', {
    url: req.url,
    originalUrl: req.originalUrl,
    fullPath: actualPath,
    exists: fileExists,
    tried_paths: [fullPath, profilePicPath, resumePath]
  });
  
  if (!fileExists) {
    console.error('File not found in any location:', {
      mainPath: fullPath,
      profilePicPath: profilePicPath,
      resumePath: resumePath,
      uploadsDir: fs.readdirSync(uploadsPath)
    });
  }
  
  next();
});

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log('\nIncoming request:');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  next();
});

// Remove duplicate static file configurations and debug middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/uploads/')) {
    const localPath = path.join(__dirname, 'uploads', req.path.replace('/api/uploads/', ''));
    console.log('Static file request details:');
    console.log('Request path:', req.path);
    console.log('Full URL:', req.originalUrl);
    console.log('Looking for file in:', localPath);
    console.log('File exists:', fs.existsSync(localPath));
  }
  next();
});

// Test root route
app.get('/', (req, res) => {
  res.json({ message: 'API is working' });
});

// Debug route to see if Express is working
app.get('/debug', (req, res) => {
  res.json({
    message: 'Debug endpoint',
    routes: app._router.stack
      .filter(r => r.route)
      .map(r => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods)
      }))
  });
});

// Routes
app.use('/api/tests', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/department-heads', departmentHeadRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationsRoutes);

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 for URL:', req.url);
  res.status(404).json({
    message: 'Route not found',
    path: req.url
  });
});

// Gestionnaire d'erreurs pour multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large' });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Start server function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/smarthire', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
        console.log('Connected to MongoDB');

    // Start listening
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Test API at: http://localhost:${PORT}/api/test`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(console.error); 