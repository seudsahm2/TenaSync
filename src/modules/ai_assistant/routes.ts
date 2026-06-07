import { Router, Request, Response } from 'express';
import { AIAssistantController } from './controller.js';

const router = Router();

// Seud's Module: AI Health Assistant
// Core Focus: Symptom analyzer, AI consultation, Follow-up questions, Emergency detection, AI patient summaries.

router.post('/analyze', AIAssistantController.analyzeSymptoms);
router.post('/summary', AIAssistantController.generateSummary);
router.post('/specialists', AIAssistantController.getSpecialists);
router.post('/qa', AIAssistantController.askGeneralHealth);
router.post('/analyze-prescription', AIAssistantController.analyzePrescription);

router.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'AI Assistant module is working' });
});

export default router;