import { Router, Request, Response } from 'express';
import { PatientService } from './service.js';
import { callLLM } from '../../core/ai/engine.js';

const router = Router();

// Eyob's Patient/Customer Module Router

/**
 * PING test route
 */
router.get('/ping', (req: Request, res: Response) => {
  res.json({ message: 'Patient module is working' });
});

/**
 * GET patient profile
 */
router.get('/profile/:id', async (req, res) => {
  try {
    const profile = await PatientService.getProfile(req.params.id);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST update patient profile
 */
router.post('/profile/:id', async (req, res) => {
  try {
    const profile = await PatientService.updateProfile(req.params.id, req.body);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET patient dashboard stats
 */
router.get('/dashboard/:id', async (req, res) => {
  try {
    const stats = await PatientService.getDashboardStats(req.params.id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET all patient appointments
 */
router.get('/appointments/:id', async (req, res) => {
  try {
    const appointments = await PatientService.getAppointments(req.params.id);
    res.json(appointments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST schedule/book appointment details
 */
router.post('/appointments/schedule', async (req, res) => {
  const { sessionId, scheduledTime, type } = req.body;
  if (!sessionId || !scheduledTime || !type) {
    return res.status(400).json({ error: 'Missing sessionId, scheduledTime, or type' });
  }

  try {
    const session = await PatientService.scheduleAppointment(sessionId, scheduledTime, type);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET patient recovery logs
 */
router.get('/recovery/:id', async (req, res) => {
  try {
    const logs = await PatientService.getRecoveryLogs(req.params.id);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST add daily recovery log
 */
router.post('/recovery/:id', async (req, res) => {
  try {
    const log = await PatientService.addRecoveryLog(req.params.id, req.body);
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST talk to Patient AI Consultant
 */
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  try {
    const systemPrompt = `
You are TenaSync, an autonomous somatic health AI assistant representing physical therapists, osteopaths, and FemTech specialists in Ethiopia.
Your task is to analyze the patient's symptoms, provide empathetic and warm somatic guidance, and suggest they see a specialist.

Keep your response brief (2-4 sentences max), highly empathetic, and professional. 
Suggest a relevant recovery action, and guide them to find a specialist in the app.

Patient's symptoms: "${message}"

Answer:`;

    const reply = await callLLM(systemPrompt);
    res.json({ replyText: reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
