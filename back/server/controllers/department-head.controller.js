import mongoose from 'mongoose';
import DepartmentHead from '../models/department-head.model.js';
import User from '../models/user.model.js';

const departmentHeadController = {
  create: async (req, res) => {
    try {
      const { company } = req.body;
      
      const departmentHead = new DepartmentHead({
        company,
        posted_jobs: [],
        candidatList: []
      });

      await departmentHead.save();
      res.status(201).json(departmentHead);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Department head already exists' });
      }
      res.status(400).json({ message: error.message });
    }
  },

  getAll: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get all users who are department heads
      const departmentHeadUsers = await User.find({ role: 'departmentHead' })
        .select('name email createdAt id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count for pagination
      const totalItems = await User.countDocuments({ role: 'departmentHead' });
      const totalPages = Math.ceil(totalItems / limit);

      // Get department head details for each user
      const departmentHeadsWithDetails = await Promise.all(
        departmentHeadUsers.map(async (user) => {
          const departmentHead = await DepartmentHead.findOne({ id: user.id }).lean();
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            company: departmentHead?.company || 'N/A',
            role: 'Department Head',
            joinDate: user.createdAt,
            totalJobs: departmentHead?.posted_jobs?.length || 0,
            totalCandidates: departmentHead?.candidatList?.length || 0
          };
        })
      );

      res.json({
        items: departmentHeadsWithDetails,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      });
    } catch (error) {
      console.error('Error fetching department heads:', error);
      res.status(500).json({ message: 'Failed to fetch department heads' });
    }
  },

  getById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }

      // First find the user
      const user = await User.findOne({ id: id, role: 'departmentHead' })
        .select('name email createdAt')
        .lean();

      if (!user) {
        return res.status(404).json({ message: 'Department head not found' });
      }

      // Then find the department head details
      const departmentHead = await DepartmentHead.findOne({ id: id }).lean();

      const formattedDepartmentHead = {
        id: id,
        name: user.name,
        email: user.email,
        company: departmentHead?.company || 'N/A',
        role: 'Department Head',
        joinDate: user.createdAt,
        posted_jobs: departmentHead?.posted_jobs || [],
        candidatList: departmentHead?.candidatList || []
      };

      res.json(formattedDepartmentHead);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addJob: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const jobId = parseInt(req.body.jobId);

      if (isNaN(id) || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }

      const departmentHead = await DepartmentHead.findOne({ id: id });
      if (!departmentHead) {
        return res.status(404).json({ message: 'Department head not found' });
      }

      if (departmentHead.posted_jobs.includes(jobId)) {
        return res.status(400).json({ message: 'Job already added to this department head' });
      }

      departmentHead.posted_jobs.push(jobId);
      await departmentHead.save();
      
      res.json(departmentHead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  addCandidate: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const candidateId = parseInt(req.body.candidateId);

      if (isNaN(id) || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }

      const departmentHead = await DepartmentHead.findOne({ id: id });
      if (!departmentHead) {
        return res.status(404).json({ message: 'Department head not found' });
      }

      if (departmentHead.candidatList.includes(candidateId)) {
        return res.status(400).json({ message: 'Candidate already added to this department head' });
      }

      departmentHead.candidatList.push(candidateId);
      await departmentHead.save();
      
      res.json(departmentHead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

export default departmentHeadController; 