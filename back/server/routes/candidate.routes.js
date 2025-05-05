import express from 'express';
import candidateController from '../controllers/candidate.controller.js';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';
import { validateCandidate } from '../middleware/validate.js';

const router = express.Router();

router.post('/', authMiddleware, authorize(['candidate']), validateCandidate, candidateController.create);
router.get('/get-all', authMiddleware, authorize(['candidate']), candidateController.getAll);
router.get('/:id', authMiddleware, authorize(['candidate']), candidateController.getById);
router.put('/:id', authMiddleware, authorize(['candidate']), validateCandidate, candidateController.update);
router.delete('/:id', authMiddleware, authorize(['hr']), candidateController.delete);
router.post('/:id/apply', authMiddleware, authorize(['candidate']), candidateController.applyForJob);

export default router; 