import { Router, Request, Response } from 'express';

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'Patient module is working' });
});

export default router;
