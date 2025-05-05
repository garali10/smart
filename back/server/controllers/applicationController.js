import Application from '../models/Application.js';
import Job from '../models/job.model.js';
import Score from '../models/Score.js';

class ApplicationController {
  async submitApplication(req, res) {
    try {
      const { jobId, userId, mbtiResult } = req.body;

      // Get job requirements
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Check if MBTI type matches requirements
      if (job.requiredMbtiTypes && job.requiredMbtiTypes.length > 0 && 
          !job.requiredMbtiTypes.includes(mbtiResult.personalityType)) {
        return res.status(400).json({ 
          message: 'Your MBTI type does not match the job requirements' 
        });
      }

      // Check if dimension scores meet minimum requirements
      if (job.minDimensionScores) {
        for (const [dimension, minScore] of Object.entries(job.minDimensionScores)) {
          if (mbtiResult.dimensionScores[dimension] < minScore) {
            return res.status(400).json({ 
              message: `Your ${dimension} score does not meet the minimum requirement` 
            });
          }
        }
      }

      // Create application
      const application = new Application({
        jobId,
        userId,
        mbtiResult,
        status: 'pending'
      });

      await application.save();

      res.json({
        success: true,
        data: application,
        message: 'Application submitted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getApplications(req, res) {
    try {
      const { userId } = req.params;
      const applications = await Application.find({ userId })
        .populate('jobId')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getApplication(req, res) {
    try {
      const { id } = req.params;
      const application = await Application.findById(id)
        .populate('jobId');

      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      res.json({
        success: true,
        data: application
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new ApplicationController(); 