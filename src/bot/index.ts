import { Telegraf } from 'telegraf';
import { config } from '../config/index.js';
import { prisma } from '../core/db/index.js';
import { setupGuestMode } from './handlers/guestMessage.js';
import { setupBusinessMessageHandler } from './handlers/businessMsg.js';

if (!config.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing in the environment variables.');
  process.exit(1);
}

export const bot = new Telegraf(config.BOT_TOKEN);

// Programmatically set global Menu Button on startup
if (config.TMA_URL) {
  const globalWebAppUrl = `${config.TMA_URL}/modules/patient/index.html?v=3`;
  bot.telegram.setChatMenuButton({
    menuButton: {
      type: 'web_app',
      text: 'TenaSync Portal',
      web_app: {
        url: globalWebAppUrl
      }
    }
  }).then(() => {
    console.log('✅ Global Chat Menu Button set to Patient Portal.');
  }).catch((err: any) => {
    console.error('⚠️ Failed to set global Chat Menu Button:', err.message);
  });
}

console.log('🤖 Initializing TenaSync Bot handlers...');

// 1. Setup Guest Mode (Stealth Interceptor)
setupGuestMode(bot);

// 2. Setup Secretary Mode (Business Connection Overrides)
setupBusinessMessageHandler(bot);

// 3. Setup Basic DM Command Handlers
bot.command('start', async (ctx) => {
  const welcomeMessage =
    `👋 *Welcome to ጤና-Sync (TenaSync)*\n\n` +
    `An autonomous, decentralized, privacy-preserving somatic health marketplace in the Telegram Ecosystem.\n\n` +
    `Please select your role to continue:`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🧑‍🦱 I am a Patient', callback_data: 'role_patient' },
          { text: '👨‍⚕️ I am a Doctor / Clinician', callback_data: 'role_doctor' }
        ],
        [
          { text: '🛡️ System Admin', callback_data: 'role_admin' }
        ]
      ]
    }
  });
});

bot.action('role_admin', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) }
    });

    if (user && user.role === 'ADMIN') {
      const adminUrl = `${config.TMA_URL}/modules/admin/index.html?v=1&user_id=${userId}`;
      await ctx.editMessageText(`Welcome back, Admin. Tap below to access the Control Panel.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛡️ Open Admin Panel', web_app: { url: adminUrl } }]
          ]
        }
      });
    } else {
      // Check if registration is open
      const res = await fetch(`http://127.0.0.1:${config.PORT}/api/admin/status`);
      const data = await res.json();
      
      if (data.isOpen) {
        const username = ctx.from?.username || '';
        const firstName = ctx.from?.first_name || 'Admin';
        const regUrl = `${config.TMA_URL}/modules/admin/register.html?v=1&user_id=${userId}&username=${username}&name=${encodeURIComponent(firstName)}`;
        await ctx.editMessageText(`Admin registration is currently OPEN.\n\nTap below to claim your Admin privileges.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔑 Register as Admin', web_app: { url: regUrl } }]
            ]
          }
        });
      } else {
        await ctx.editMessageText(`⛔ You are not an Admin. Admin registration is currently closed.`);
      }
    }
  } catch (err) {
    console.error(err);
    await ctx.answerCbQuery('Error connecting to database');
  }
});

bot.action('role_patient', async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || '';
  const firstName = ctx.from?.first_name || 'User';

  const webAppUrl = `${config.TMA_URL}/modules/patient/index.html?v=3&user_id=${userId}&username=${username}&name=${encodeURIComponent(firstName)}`;

  await ctx.editMessageText(`Welcome to the Patient Portal. Tap below to access your workspace.`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔬 Open Patient Workspace (TMA)', web_app: { url: webAppUrl } }
        ]
      ]
    }
  });
});

bot.action('role_doctor', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) }
    });

    if (user && user.role === 'CLINICIAN') {
      if (user.isVerifiedClinician) {
        // Verified doctor - send to dashboard
        const dashboardUrl = `${config.TMA_URL}/modules/doctor/views/dashboard.html?v=1&user_id=${userId}`;
        await ctx.editMessageText(`Welcome back, Dr. ${user.firstName}. Tap below to access your dashboard.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👨‍⚕️ Open Doctor Dashboard', web_app: { url: dashboardUrl } }]
            ]
          }
        });
      } else {
        // Pending approval
        await ctx.editMessageText(`⏳ Your clinician registration is currently pending Admin review. We will notify you once approved.`);
      }
    } else {
      // Not a clinician - send to registration form
      const username = ctx.from?.username || '';
      const firstName = ctx.from?.first_name || 'Doctor';
      const registerUrl = `${config.TMA_URL}/modules/doctor/register.html?v=1&user_id=${userId}&username=${username}&name=${encodeURIComponent(firstName)}`;
      
      await ctx.editMessageText(`You are not registered as a Clinician yet.\n\nTap below to fill out the verification form and upload your credentials.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Register as Clinician', web_app: { url: registerUrl } }]
          ]
        }
      });
    }
  } catch (err) {
    console.error(err);
    await ctx.answerCbQuery('Error connecting to database');
  }
});

bot.command('help', async (ctx) => {
  const helpText =
    `🔍 *TenaSync Helper commands:*\n\n` +
    `/start - Initialize workspace link and access Mini App\n` +
    `/help - View this help menu\n\n` +
    `🌿 *Stealth Diagnostic Mode:*\n` +
    `You can mention this bot in any group chat detailing a cervical/lumbar spine stiffness or somatic strain, and the bot will reply with a secure, private scanning link.\n\n` +
    `📖 *Clinician Guidelines Upload:*\n` +
    `Clinicians can send a plain text file (\`.txt\`) directly to this bot chat. The AI front desk will read it as a reference book to answer patient symptoms.`;

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// 4. Document / Guide upload handler for clinicians
bot.on('document', async (ctx) => {
  const userId = ctx.from?.id;
  const doc = ctx.message.document;

  if (!userId || !doc) return;

  try {
    // Check if sender is registered as CLINICIAN
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) }
    });

    if (!user || user.role !== 'CLINICIAN') {
      await ctx.reply("❌ Document uploads are restricted to registered TenaSync clinicians.");
      return;
    }

    if (!doc.file_name?.endsWith('.txt')) {
      await ctx.reply("❌ Please upload your guidelines as a plain text file (.txt).");
      return;
    }

    await ctx.reply("⏳ Downloading and parsing your guideline document...");

    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    const response = await fetch(fileLink.href);
    const content = await response.text();

    if (!content.trim()) {
      await ctx.reply("❌ The uploaded document appears to be empty.");
      return;
    }

    // Save document
    await prisma.clinicianDocument.create({
      data: {
        title: doc.file_name,
        content: content,
        userId: user.id
      }
    });

    await ctx.reply(`✅ *Success!* Reference book "${doc.file_name}" (${content.length} characters) has been successfully uploaded and processed. Your AI Secretary will now use this document to answer patient consultations.`, {
      parse_mode: 'Markdown'
    });

  } catch (err: any) {
    console.error("Error processing document upload:", err);
    await ctx.reply(`❌ Failed to process document: ${err.message}`);
  }
});

bot.catch((err, ctx) => {
  console.error(`❌ Telegraf Bot Error for update type: ${ctx.updateType}`, err);
});

