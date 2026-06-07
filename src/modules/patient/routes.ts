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
 * POST login/create user
 */
router.post('/login', async (req, res) => {
  try {
    const { telegramId, name } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });
    const user = await PatientService.loginUser(telegramId, name);
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
 * GET completed consultations history
 */
router.get('/history/:id', async (req, res) => {
  try {
    // Actually, get ALL consultations for chat functionality
    const history = await PatientService.getAllConsultations(req.params.id);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST send message from patient
 */
router.post('/consultations/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text, userId } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const message = await PatientService.sendMessage(userId, sessionId, text);
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET consultation messages
 */
router.get('/consultations/:sessionId/messages', async (req, res) => {
  try {
    const messages = await PatientService.getConsultationMessages(req.params.sessionId);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST rate doctor
 */
router.post('/rate/:doctorId', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating) return res.status(400).json({ error: 'Missing rating' });
    const doctor = await PatientService.rateDoctor(req.params.doctorId, parseFloat(rating));
    res.json({ success: true, doctor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET medication reminders
 */
router.get('/reminders/:id', async (req, res) => {
  try {
    const reminders = await PatientService.getReminders(req.params.id);
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST add medication reminder
 */
router.post('/reminders/:id', async (req, res) => {
  try {
    const reminder = await PatientService.addReminder(req.params.id, req.body);
    res.json(reminder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE medication reminder
 */
router.delete('/reminders/:userId/:reminderId', async (req, res) => {
  try {
    await PatientService.deleteReminder(req.params.userId, req.params.reminderId);
    res.json({ success: true });
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
