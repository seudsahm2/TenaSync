import { Router } from 'express';
import { AIAssistantController } from './controller.js';

const router = Router();

// Seud's Module: AI Health Assistant
// Core Focus: Symptom analyzer, AI consultation, Follow-up questions, Emergency detection, AI patient summaries.

router.post('/analyze', AIAssistantController.analyzeSymptoms);
router.post('/summary', AIAssistantController.generateSummary);
router.post('/specialists', AIAssistantController.getSpecialists);

export default router;
