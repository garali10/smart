import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { JobListing } from './types/job';
import { authController } from './controllers/authController';



const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001', // Vite's default port
  credentials: true
}));

// In-memory storage with proper typing
let jobs: JobListing[] = [];

interface QueryParams {
  search?: string;
  department?: string;
  type?: string;
  status?: string;
}

// Routes
app.get('/api/jobs', (req: Request<{}, {}, {}, QueryParams>, res: Response) => {
  const { search, department, type, status } = req.query;
  
  let filteredJobs = [...jobs];

  if (search) {
    filteredJobs = filteredJobs.filter(job => 
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (department) {
    filteredJobs = filteredJobs.filter(job => job.department === department);
  }

  if (type) {
    filteredJobs = filteredJobs.filter(job => job.type === type);
  }

  if (status) {
    filteredJobs = filteredJobs.filter(job => job.status === status);
  }

  res.json(filteredJobs);
});

app.post('/api/jobs', (req: Request, res: Response) => {
  const newJob: JobListing = {
    id: uuidv4(),
    ...req.body,
    postedDate: new Date().toISOString()
  };
  jobs.push(newJob);
  res.status(201).json(newJob);
});

interface JobParams {
  id: string;
}

app.put('/api/jobs/:id', (req: Request<JobParams>, res: Response) => {
  const { id } = req.params;
  const jobIndex = jobs.findIndex(job => job.id === id);
  
  if (jobIndex === -1) {
    return res.status(404).json({ message: 'Job not found' });
  }

  jobs[jobIndex] = { ...jobs[jobIndex], ...req.body };
  res.json(jobs[jobIndex]);
});

app.delete('/api/jobs/:id', (req: Request<JobParams>, res: Response) => {
  const { id } = req.params;
  jobs = jobs.filter(job => job.id !== id);
  res.status(204).send();
});

interface PsychTestAnswers {
  [key: string]: any;
}

app.post('/api/jobs/:id/psych-test', (req: Request<JobParams, {}, PsychTestAnswers>, res: Response) => {
  const { id } = req.params;
  const answers = req.body;
  
  // Here you would typically:
  // 1. Validate the answers
  // 2. Score the test
  // 3. Store the results
  // 4. Return a pass/fail result

  res.json({ 
    status: 'success',
    result: 'passed',
    score: 85 // Example score
  });
});

// Auth routes
app.post('/api/auth/login', authController.login);
app.post('/api/auth/register', authController.register);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 