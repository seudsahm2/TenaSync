import { Request, Response } from 'express';
import { MaternalService } from '../services/maternal.service.js';
import { MaternalLogSchema } from '../validators/schemas.js';

export class MaternalController {
  static async logStatus(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId is required' });

      const parsedData = MaternalLogSchema.parse(req.body);
      const result = await MaternalService.logStatus(userId, parsedData);
      
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation Error', details: error.errors });
      }
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  static async getLogs(req: Request, res: Response) {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required in query params' });
      }

      const results = await MaternalService.getLogs(userId);
      return res.json({ success: true, data: results });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }
}
