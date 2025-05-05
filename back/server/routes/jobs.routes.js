import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Job from '../models/Job.js';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'jobs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created jobs upload directory at:', uploadDir);
}

// Configure multer for job image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'job-' + uniqueSuffix + ext);
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Get all jobs with optional filters
router.get('/', async (req, res) => {
  try {
    const { search, department, type, status } = req.query;
    let query = { status: 'active' }; // Default to only active jobs

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = department;
    }

    if (type) {
      query.type = type;
    }

    // Only allow status filter if explicitly provided
    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query).sort({ postedDate: -1 });
    
    // Transform job data to include full image URLs
    const transformedJobs = jobs.map(job => {
      const jobObj = job.toObject();
      // Use the virtual imageUrl property
      jobObj.image = jobObj.imageUrl;
      return jobObj;
    });
    
    res.json(transformedJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Error fetching jobs', error: error.message });
  }
});

// Get a single job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Transform job data to include full image URL
    const jobObj = job.toObject();
    // Use the virtual imageUrl property
    jobObj.image = jobObj.imageUrl;
    
    res.json(jobObj);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Error fetching job', error: error.message });
  }
});

// Create a new job
router.post('/', authMiddleware, authorize(['hr', 'admin']), upload.single('image'), async (req, res) => {
  try {
    console.log('Creating new job:', req.body);
    console.log('File:', req.file);

    const jobData = {
      ...req.body,
      postedDate: new Date()
    };

    // Add image path if an image was uploaded
    if (req.file) {
      jobData.image = `/uploads/jobs/${req.file.filename}`;
      console.log('Image path:', jobData.image);
    }

    const job = new Job(jobData);
    await job.save();
    
    // Transform job data to include full image URL
    const jobObj = job.toObject();
    if (jobObj.image) {
      jobObj.image = `/uploads/jobs/${path.basename(jobObj.image)}`;
    }
    
    res.status(201).json(jobObj);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Error creating job', error: error.message });
  }
});

// Update a job
router.put('/:id', authMiddleware, authorize(['hr', 'admin']), upload.single('image'), async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Add image path if a new image was uploaded
    if (req.file) {
      // Delete old image if it exists
      const oldJob = await Job.findById(req.params.id);
      if (oldJob?.image) {
        const oldImagePath = path.join(uploadDir, path.basename(oldJob.image));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      updateData.image = `/uploads/jobs/${req.file.filename}`;
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Transform job data to include full image URL
    const jobObj = job.toObject();
    if (jobObj.image) {
      jobObj.image = `/uploads/jobs/${path.basename(jobObj.image)}`;
    }

    res.json(jobObj);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Error updating job', error: error.message });
  }
});

// Delete a job
router.delete('/:id', authMiddleware, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Delete job image if it exists
    if (job.image) {
      const imagePath = path.join(uploadDir, path.basename(job.image));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Error deleting job', error: error.message });
  }
});

export default router;