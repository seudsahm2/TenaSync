import { Request, Response } from 'express';
import { NutritionService } from '../services/nutrition.service.js';
import { NutritionPlanSchema } from '../validators/schemas.js';

export class NutritionController {
  static async createPlan(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId is required' });

      const parsedData = NutritionPlanSchema.parse(req.body);
      const result = await NutritionService.createPlan(userId, parsedData);
      
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  static async getActivePlan(req: Request, res: Response) {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required in query params' });
      }

      const results = await NutritionService.getActivePlan(userId);
      return res.json({ success: true, data: results });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }
}
