import express from 'express';
import testController from '../controllers/testController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Test management routes
router.post('/:testId/start', authenticateUser, testController.startTest);
router.post('/:testId/continue', authenticateUser, testController.continueTest);
router.post('/:testId/complete', authenticateUser, testController.completeTest);
router.get('/:testId/results', authenticateUser, testController.getTestResults);
router.get('/:testId/history', authenticateUser, testController.getTestHistory);

// Session management routes
router.post('/:testId/pause', authenticateUser, testController.pauseTest);
router.post('/:testId/resume', authenticateUser, testController.resumeTest);
router.get('/:testId/status', authenticateUser, testController.getSessionStatus);

// Analysis routes
router.get('/:testId/analysis', authenticateUser, testController.getDetailedAnalysis);

export default router; 