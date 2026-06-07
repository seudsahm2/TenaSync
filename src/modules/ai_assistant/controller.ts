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

  static async askGeneralHealth(req: Request, res: Response): Promise<void> {
    try {
      const { question, language } = req.body;
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Question text is required' });
        return;
      }

      const answer = await AIAssistantService.askGeneralHealth(question, language);
      res.json({ success: true, data: { answer } });
    } catch (error: any) {
      console.error('Error in askGeneralHealth:', error);
      res.status(500).json({ error: 'Failed to answer health question', details: error.message });
    }
  }

  static async analyzePrescription(req: Request, res: Response): Promise<void> {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || !mimeType) {
        res.status(400).json({ error: 'Image data and mimeType are required' });
        return;
      }

      const analysis = await AIAssistantService.parsePrescriptionImage(imageBase64, mimeType);
      res.json({ success: true, data: analysis });
    } catch (error: any) {
      console.error('Error in analyzePrescription:', error);
      res.status(500).json({ error: 'Failed to analyze prescription', details: error.message });
    }
  }
}
