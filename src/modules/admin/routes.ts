import { Router } from 'express';
import { AdminService } from './service.js';

const router = Router();

router.get('/pending-doctors', async (req, res) => {
  try {
    const doctors = await AdminService.getPendingDoctors();
    res.json({ success: true, data: doctors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/approve-doctor/:id', async (req, res) => {
  try {
    await AdminService.approveDoctor(req.params.id);
    res.json({ success: true, message: 'Doctor approved.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reject-doctor/:id', async (req, res) => {
  try {
    await AdminService.rejectDoctor(req.params.id);
    res.json({ success: true, message: 'Doctor rejected.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const isOpen = await AdminService.isRegistrationOpen();
    res.json({ success: true, isOpen });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/toggle', async (req, res) => {
  try {
    const { isOpen } = req.body;
    await AdminService.toggleRegistration(isOpen);
    res.json({ success: true, isOpen });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { telegramId, firstName, username } = req.body;
    const user = await AdminService.registerAdmin(telegramId, firstName, username);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

export default router;
