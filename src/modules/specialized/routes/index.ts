import { Router } from 'express';
import { SpineController } from '../controllers/spine.controller.js';
import { MaternalController } from '../controllers/maternal.controller.js';
import { NutritionController } from '../controllers/nutrition.controller.js';

const router = Router();

// Spine routes
router.post('/spine/assessment', SpineController.logAssessment);
router.get('/spine/assessment', SpineController.getAssessments);

// Maternal routes
router.post('/maternal/logs', MaternalController.logStatus);
router.get('/maternal/logs', MaternalController.getLogs);

// Nutrition routes
router.post('/nutrition/plan', NutritionController.createPlan);
router.get('/nutrition/plan', NutritionController.getActivePlan);

export default router;
