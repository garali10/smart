import express from 'express';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';
import mongoose from 'mongoose';
import Score from '../models/Score.js';

const router = express.Router();

// Get Score data for a specific user (for HR/admin)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Admin/HR fetching MBTI score data for user: ${userId}`);
    
    // Validate the userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    // Find the most recent score for the specified user
    const score = await Score.findOne({
      userId: userId,
      status: 'completed'
    }).sort({ completedAt: -1 });
    
    if (!score) {
      console.log(`No completed score found for user: ${userId}`);
      return res.status(200).json({
        status: 'not_found',
        message: 'No MBTI score found for this user'
      });
    }
    
    console.log(`Found completed score for user ${userId}:`, score._id);
    return res.status(200).json({
      status: 'success',
      completedAt: score.completedAt || score.lastUpdated,
      personalityType: score.personalityType,
      dimensionScores: score.dimensionScores,
      totalScore: score.totalScore
    });
  } catch (error) {
    console.error(`Error fetching MBTI score for user ${req.params.userId}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve MBTI score',
      error: error.message
    });
  }
});

export default router; 