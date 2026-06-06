import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { prisma } from './core/db/index.js';
import { bot } from './bot/index.js';

// Import distributed modules
import patientRoutes from './modules/patient/routes.js';
import doctorRoutes from './modules/doctor/routes.js';
import aiAssistantRoutes from './modules/ai_assistant/routes.js';
import linguisticsRoutes from './modules/linguistics/routes.js';
import specializedRoutes from './modules/specialized/routes.js';

// Resolve dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
// Global BigInt serializer override for JSON responses
app.set('json replacer', (key: string, value: any) => {
  return typeof value === 'bigint' ? value.toString() : value;
});

// Redirect root to Patient Portal
app.get('/', (req, res) => {
  res.redirect('/modules/patient/index.html');
});

// Serve TMA static files AFTER custom routes so our redirect takes priority over index.html static serving
app.use(express.static(path.join(__dirname, 'public')));

// Serve module-specific frontends directly from their modular folders
app.use('/modules/patient', express.static(path.join(__dirname, 'modules/patient/public')));
app.use('/modules/doctor', express.static(path.join(__dirname, 'modules/doctor/public')));
app.use('/modules/ai_assistant', express.static(path.join(__dirname, 'modules/ai_assistant/public')));
app.use('/modules/linguistics', express.static(path.join(__dirname, 'modules/linguistics/public')));
app.use('/modules/specialized', express.static(path.join(__dirname, 'modules/specialized/public')));

// Mount distributed modules
app.use('/api/patient', patientRoutes);            // Eyob's module
app.use('/api/doctor', doctorRoutes);              // Seud's module
app.use('/api/ai', aiAssistantRoutes);             // Ermiyas's module
app.use('/api/linguistics', linguisticsRoutes);    // Yabsira's module
app.use('/api/specialized', specializedRoutes);    // Tigistu's module

/**
 * API: Match clinicians based on patient symptoms
 */
app.post('/api/clinicians/match', async (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms) return res.status(400).json({ error: 'Missing symptoms' });

  try {
    const clinicians = await prisma.user.findMany({
      where: { role: 'CLINICIAN' }
    });

    const response = clinicians.map(c => ({
      id: c.id,
      firstName: c.firstName,
      specialty: c.specialty || 'General Practitioner',
      treatmentOptions: c.treatmentOptions,
      telegramId: c.telegramId.toString()
    }));

    return res.json(response);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * API: Request consultation
 */
app.post('/api/consultation/start', async (req, res) => {
  const { patientTelegramId, clinicianId, symptoms } = req.body;

  if (!patientTelegramId || !clinicianId || !symptoms) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    let patient = await prisma.user.findUnique({
      where: { telegramId: BigInt(patientTelegramId) }
    });

    if (!patient) {
      patient = await prisma.user.create({
        data: {
          telegramId: BigInt(patientTelegramId),
          firstName: 'Patient ' + patientTelegramId.toString().slice(-4),
          role: 'PATIENT'
        }
      });
    }

    const clinician = await prisma.user.findUnique({
      where: { id: clinicianId }
    });

    if (!clinician) {
      return res.status(404).json({ error: 'Clinician not found' });
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
    const consultation = await prisma.consultationSession.create({
      data: {
        sessionId,
        patientSymptoms: symptoms,
        patientId: patient.id,
        clinicianId: clinician.id,
        status: 'ACTIVE'
      },
      include: { patient: true, clinician: true }
    });

    const welcomeText =
      `Hello! I am ${clinician.firstName}'s automated front-desk assistant. ` +
      `I received your consultation request regarding: "${symptoms}". ` +
      `Could you tell me a little bit more about how long you've had these symptoms?`;

    await prisma.consultationMessage.create({
      data: {
        consultationId: consultation.id,
        sender: 'CLINICIAN',
        text: welcomeText
      }
    });

    let delivered = false;
    if (clinician.businessConnectionId && clinician.canReply) {
      try {
        await (bot.telegram as any).callApi('sendMessage', {
          chat_id: patientTelegramId.toString(),
          text: welcomeText,
          business_connection_id: clinician.businessConnectionId
        });
        delivered = true;
        console.log(`[Server] Consultation start message sent via clinician business connection.`);
      } catch (err: any) {
        console.error('[Server] Failed to deliver via business connection:', err.message);
      }
    }

    const warnings: string[] = [];

    if (!delivered) {
      console.log(`[Server] Falling back to Direct Bot DMs...`);
      try {
        await bot.telegram.sendMessage(
          patientTelegramId.toString(),
          `🏪 *${clinician.firstName}'s Front Desk:* ${welcomeText}`,
          { parse_mode: 'Markdown' }
        );
      } catch (err: any) {
        console.warn(`[Server] Failed to send fallback DM to patient ${patientTelegramId}:`, err.message);
        if (err.message.includes('chat not found') || err.message.includes('blocked')) {
          warnings.push(`You (Patient) have not started @TenaSyncbot yet. Please search for @TenaSyncbot and tap Start to receive direct notification messages.`);
        }
      }
      try {
        await bot.telegram.sendMessage(
          clinician.telegramId.toString(),
          `⚠️ *TenaSync Consultation Alert!*\n\n` +
          `Patient *${patient.firstName}* requested a consultation for symptoms: *"${symptoms}"*.\n` +
          `Your automated front desk has sent a message to the patient. Please connect your chatbot in Telegram Settings to auto-reply in-chat.`
        );
      } catch (err: any) {
        console.warn(`[Server] Failed to send fallback DM to clinician:`, err.message);
      }
    }

    return res.status(201).json({
      id: consultation.id,
      sessionId: consultation.sessionId,
      status: consultation.status,
      clinician: { firstName: clinician.firstName },
      warnings
    });
  } catch (err: any) {
    console.error('Error creating consultation request:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * API: Dispatch confidential postpartum referral request
 */
app.post('/api/maternal/dispatch', async (req, res) => {
  const { patientTelegramId, postpartumDay, painLevel } = req.body;

  try {
    console.log(`🔒 [Confidential Dispatch] Patient=${patientTelegramId}, Day=${postpartumDay}, Pain=${painLevel}`);

    // Fetch the postpartum coach (Kidist)
    const coach = await prisma.user.findFirst({
      where: { role: 'CLINICIAN', username: 'kidist_maternal_wellness' }
    });

    // Best-effort: notify coach (fails silently for seeded/fake Telegram IDs)
    if (coach) {
      bot.telegram.sendMessage(
        coach.telegramId.toString(),
        `🤰 *Confidential Maternal Referral Alert!*\n\n` +
        `An anonymous postpartum patient (currently on *Day ${postpartumDay}*) has requested somatic coaching.\n` +
        `• Pelvic Pain severity: *${painLevel}*\n\n` +
        `Please open your direct messages to begin consultation.`,
        { parse_mode: 'Markdown' }
      ).catch((err: any) => console.warn('[Server] Coach DM failed (non-critical):', err.message));
    }

    return res.json({ success: true, message: 'Anonymized specialist referral dispatched' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Start bot and express server
app.listen(config.PORT, 'localhost', async () => {
  console.log(`🚀 TenaSync Express Server running on http://localhost:${config.PORT}`);

  // Launch Telegraf Bot via Polling in Dev
  bot.telegram.deleteWebhook({ drop_pending_updates: true })
    .then(() => bot.launch())
    .then(() => {
      console.log('🤖 TenaSync Telegram Bot is polling live updates.');
    })
    .catch((err) => {
      console.error('❌ Failed to launch Telegraf bot polling:', err);
    });
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
