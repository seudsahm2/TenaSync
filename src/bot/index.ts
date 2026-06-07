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
  const userId = ctx.from?.id;
  const username = ctx.from?.username || '';
  const firstName = ctx.from?.first_name || 'User';

  const welcomeMessage =
    `👋 *Welcome to ጤና-Sync (TenaSync)*\n\n` +
    `An autonomous, decentralized, privacy-preserving somatic health marketplace in the Telegram Ecosystem.\n\n` +
    `• If you are a *Patient*: Tap the button below to monitor your posture spine index, maternal reproductive recovery logs, and compile indigenous ancestral health remedies.\n\n` +
    `• If you are a *Clinician*: Connect your bot via *Telegram Business > Chatbots* to automate your scheduling and front desk rate negotiations.`;

  const webAppUrl = `${config.TMA_URL}/modules/patient/index.html?v=3&user_id=${userId}&username=${username}&name=${encodeURIComponent(firstName)}`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔬 Open TenaSync Workspace (TMA)', web_app: { url: webAppUrl } }
        ]
      ]
    }
  });
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
