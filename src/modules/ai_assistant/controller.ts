import { Request, Response } from 'express';
import { AIAssistantService } from './service.js';

export class AIAssistantController {
  static async analyzeSymptoms(req: Request, res: Response): Promise<void> {
    try {
      const { symptoms } = req.body;
      if (!symptoms || typeof symptoms !== 'string') {
        res.status(400).json({ error: 'Symptoms text is required' });
        return;
      }

      const result = await AIAssistantService.analyzeSymptoms(symptoms);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in analyzeSymptoms:', error);
      res.status(500).json({ error: 'Failed to analyze symptoms', details: error.message });
    }
  }

  static async generateSummary(req: Request, res: Response): Promise<void> {
    try {
      const { consultationId } = req.body;
      if (!consultationId || typeof consultationId !== 'string') {
        res.status(400).json({ error: 'Consultation ID is required' });
        return;
      }

      const summary = await AIAssistantService.generateSummary(consultationId);
      res.json({ success: true, data: { summary } });
    } catch (error: any) {
      console.error('Error in generateSummary:', error);
      res.status(500).json({ error: 'Failed to generate summary', details: error.message });
    }
  }

  static async getSpecialists(req: Request, res: Response): Promise<void> {
    try {
      const { condition } = req.body;
      if (!condition || typeof condition !== 'string') {
        res.status(400).json({ error: 'Condition is required' });
        return;
      }

      const specialists = await AIAssistantService.matchSpecialist(condition);
      res.json({ success: true, data: specialists });
    } catch (error: any) {
      console.error('Error in getSpecialists:', error);
      res.status(500).json({ error: 'Failed to find specialists', details: error.message });
    }
  }
}
