import Candidate from '../models/candidate.model.js';
import User from '../models/user.model.js';

const candidateController = {
  // Create new candidate
  create: async (req, res) => {
    try {
      const candidate = new Candidate({
        name: req.body.name,
        email: req.body.email,
        resume: req.body.resume,
        skills: req.body.skills,
        experience: req.body.experience,
        education: req.body.education,
        applied_jobs: [],
        psyco_test_result: null
      });

      await candidate.save();
      res.status(201).json(candidate);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Get all candidates
  getAll: async (req, res) => {
    try {
      const candidates = await Candidate.find();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get candidate by ID
  getById: async (req, res) => {
    try {
      const candidate = await User.findOne({ 
        id: req.params.id,
        role: 'candidate'
      }).select('-password');

      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      res.json(candidate);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Update candidate
  update: async (req, res) => {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      res.json(candidate);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Delete candidate
  delete: async (req, res) => {
    try {
      const candidate = await Candidate.findByIdAndDelete(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Apply for job
  applyForJob: async (req, res) => {
    try {
      const { jobId } = req.body;
      const candidate = await Candidate.findById(req.params.id);
      
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      if (candidate.applied_jobs.includes(jobId)) {
        return res.status(400).json({ message: 'Already applied to this job' });
      }

      candidate.applied_jobs.push(jobId);
      await candidate.save();
      
      res.json(candidate);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  updatePsycoTest: async (req, res) => {
    try {
      const { result } = req.body;
      const candidate = await Candidate.findById(req.params.id);
      
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      candidate.psyco_test_result = result;
      await candidate.save();
      
      res.json(candidate);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

export default candidateController; 