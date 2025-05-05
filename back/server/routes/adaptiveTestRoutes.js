import express from 'express';
import adaptiveTestController from '../controllers/adaptiveTestController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Start a new adaptive test
router.post('/tests/:testId/start', 
  authenticateUser, 
  adaptiveTestController.startTest
);

// Submit an answer and get next question
router.post('/tests/:testId/questions/:questionId/answer',
  authenticateUser,
  adaptiveTestController.submitAnswer
);

export default router; 