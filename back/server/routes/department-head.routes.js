import express from 'express';
import departmentHeadController from '../controllers/department-head.controller.js';
import { validateDepartmentHead, validateNumericId } from '../middleware/validate.js';
import { authMiddleware, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// This creates the full route: /api/department-heads/
router.post('/', validateDepartmentHead, departmentHeadController.create);
// This creates: /api/department-heads/get-all
router.get('/get-all', departmentHeadController.getAll);
// This creates: /api/department-heads/:id
router.get('/:id', validateNumericId, departmentHeadController.getById);
router.post('/:id/jobs', validateNumericId, departmentHeadController.addJob);
router.post('/:id/candidates', validateNumericId, departmentHeadController.addCandidate);

router.get('/', authMiddleware, authorize(['departmentHead']), async (req, res) => {
  // ... route handler code
});

export default router; 