import User from '../models/user.model.js';
import HR from '../models/hr.model.js';

const hrController = {
  // Create new HR
  create: async (req, res) => {
    try {
      const hr = new User({
        ...req.body,
        role: 'hr'
      });
      await hr.save();
      res.status(201).json(hr);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Get all HRs
  getAll: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;

      // Get total count of HR users
      const totalItems = await User.countDocuments({ role: 'hr' });
      const totalPages = Math.ceil(totalItems / limit);

      // Get paginated HR users
      const hrs = await User.find({ role: 'hr' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password');

      res.json({
        items: hrs,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      });
    } catch (error) {
      console.error('Error fetching HR users:', error);
      res.status(500).json({ message: 'Error fetching HR users' });
    }
  },

  // Get HR by ID
  getById: async (req, res) => {
    try {
      const hr = await User.findOne({ _id: req.params.id, role: 'hr' }).select('-password');
      if (!hr) {
        return res.status(404).json({ message: 'HR not found' });
      }
      res.json(hr);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update HR
  update: async (req, res) => {
    try {
      const hr = await User.findOneAndUpdate(
        { _id: req.params.id, role: 'hr' },
        { ...req.body, role: 'hr' },
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!hr) {
        return res.status(404).json({ message: 'HR not found' });
      }
      res.json(hr);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Delete HR
  delete: async (req, res) => {
    try {
      const hr = await User.findOneAndDelete({ _id: req.params.id, role: 'hr' });
      if (!hr) {
        return res.status(404).json({ message: 'HR not found' });
      }
      res.json({ message: 'HR deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Assign candidate to HR
  assignCandidate: async (req, res) => {
    try {
      const { candidateId } = req.body;
      const hr = await User.findOne({ _id: req.params.id, role: 'hr' });
      
      if (!hr) {
        return res.status(404).json({ message: 'HR not found' });
      }

      // If hr.managedCandidates doesn't exist, initialize it
      if (!hr.managedCandidates) {
        hr.managedCandidates = [];
      }

      hr.managedCandidates.push(candidateId);
      await hr.save();
      
      res.json(hr);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

export default hrController; 