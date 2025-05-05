import express from 'express';
import hrController from '../controllers/hr.controller.js';
import { validateHR } from '../middleware/validate.js';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Define routes
router.post('/', validateHR, hrController.create);
router.get('/get-all', authMiddleware, authorize(['hr']), hrController.getAll);
router.get('/:id', hrController.getById);
router.put('/:id', validateHR, hrController.update);
router.delete('/:id', hrController.delete);
router.post('/:id/assign-candidate', hrController.assignCandidate);

export default router; 