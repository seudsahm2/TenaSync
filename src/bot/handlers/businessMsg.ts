import { Telegraf } from 'telegraf';
import { prisma } from '../../core/db/index.js';
import { config } from '../../config/index.js';
import { processClinicianConsultationTurn } from '../../core/ai/engine.js';
export function setupBusinessMessageHandler(bot: Telegraf) {
  bot.use(async (ctx, next) => {
    const update = ctx.update as any;

    // 1. Listen for connection updates
    if (update.business_connection) {
      const conn = update.business_connection;
      console.log(`[Business Connection] Status: enabled=${conn.is_enabled}, id=${conn.id}, user=${conn.user.id}, name=${conn.user.first_name}`);

      try {
        if (conn.is_enabled) {
          // Upsert: create clinician if not found, update connection if they exist
          const clinician = await prisma.user.upsert({
            where: { telegramId: BigInt(conn.user.id) },
            update: {
              businessConnectionId: conn.id,
              canReply: true,
            },
            create: {
              telegramId: BigInt(conn.user.id),
              firstName: conn.user.first_name || 'Clinician',
              username: conn.user.username || null,
              role: 'CLINICIAN',
              isVerifiedClinician: true,
              canReply: true,
              businessConnectionId: conn.id,
            }
          });
          console.log(`[Business Connection] ✅ Clinician "${clinician.firstName}" (ID: ${clinician.id}) registered/updated with connection ${conn.id}.`);

          // Welcome DM to the clinician
          try {
            await bot.telegram.sendMessage(
              conn.user.id.toString(),
              `✅ *TenaSync AI Secretary Activated!*\n\n` +
              `Hello *${clinician.firstName}*! Your Telegram Business account is now linked to the *ጤና-Sync* AI front desk.\n\n` +
              `🤖 *How it works:*\n` +
              `• When patients message you, the AI Secretary will *automatically negotiate rates* on your behalf.\n` +
              `• If you type a reply yourself, the AI will *stand down for 30 minutes* out of respect for your input.\n` +
              `• All deals route through a *double-blind escrow* — your minimum floor price is never visible to patients.\n\n` +
              `You can start sending patients to your chat now. 🎉`,
              { parse_mode: 'Markdown' }
            );
          } catch (dmErr) {
            console.warn('[Business Connection] Could not send welcome DM to clinician:', dmErr);
          }
        } else {
          // Disabled connection
          const result = await prisma.user.updateMany({
            where: { businessConnectionId: conn.id },
            data: { canReply: false, businessConnectionId: null }
          });
          console.log(`[Business Connection] ❌ Disabled connection for ${result.count} clinician(s).`);
        }
      } catch (err) {
        console.error('[Business Connection] Error processing update:', err);
      }
      return next();
    }

    // 2. Listen for messages on business account
    if (!update.business_message) return next();

    const businessMsg = update.business_message;
    const businessConnectionId: string = businessMsg.business_connection_id;
    const chatParticipantId = businessMsg.chat.id; // Telegram ID of the patient
    const senderId = businessMsg.from.id;          // Telegram ID of the sender
    const text = businessMsg.text || '';
    const messageId = businessMsg.message_id;

    // Ignore messages between the clinician and the bot itself (e.g. commands, document uploads)
    const botIdStr = config.BOT_TOKEN.split(':')[0];
    if (chatParticipantId.toString() === botIdStr) {
      return next();
    }

    console.log(`[Business Msg] Text: "${text}", from: ${senderId}, chat: ${chatParticipantId}, conn: ${businessConnectionId}`);

    if (!text) return;

    try {
      // Find the clinician user associated with this business connection
      let clinician = await prisma.user.findFirst({
        where: { businessConnectionId }
      });

      // Fallback: auto-register by resolving the connection via Telegram API
      // (handles pre-existing connections made before auto-register was deployed)
      if (!clinician) {
        console.log(`[Business Msg] Unknown connection ID: ${businessConnectionId}. Resolving via Telegram API...`);
        try {
          const conn = await (bot.telegram as any).callApi('getBusinessConnection', {
            business_connection_id: businessConnectionId
          });

          if (conn && conn.user) {
            clinician = await prisma.user.upsert({
              where: { telegramId: BigInt(conn.user.id) },
              update: { businessConnectionId, canReply: true },
              create: {
                telegramId: BigInt(conn.user.id),
                firstName: conn.user.first_name || 'Clinician',
                username: conn.user.username || null,
                role: 'CLINICIAN',
                isVerifiedClinician: true,
                canReply: true,
                businessConnectionId,
              }
            });
            console.log(`[Business Msg] ✅ Auto-registered clinician "${clinician.firstName}" from live connection lookup.`);
          }
        } catch (resolveErr: any) {
          console.error(`[Business Msg] Could not resolve connection ${businessConnectionId}:`, resolveErr.message);
        }

        // If still null after resolve attempt, bail out
        if (!clinician) {
          console.log(`[Business Msg] Could not identify clinician for connection ${businessConnectionId}. Skipping.`);
          return;
        }
      }

      // Find the active consultation
      const consultation = await prisma.consultationSession.findFirst({
        where: {
          status: 'ACTIVE',
          clinicianId: clinician.id,
          patient: { telegramId: BigInt(chatParticipantId) }
        },
        include: {
          patient: true,
          clinician: true
        }
      });

      if (!consultation) {
        console.log(`[Business Msg] No active consultation for clinician ${clinician.id} and patient ${chatParticipantId}`);
        return;
      }

      // Check if auto-reply was turned off for human takeover
      if (!consultation.autoReplyEnabled) {
        console.log(`[Business Msg] Auto-reply is PAUSED for consultation ${consultation.id}. Human clinician is in control.`);
        // Log patient's message but do not trigger AI
        await prisma.consultationMessage.create({
          data: {
            consultationId: consultation.id,
            sender: 'PATIENT',
            text,
            telegramMessageId: messageId
          }
        });
        return;
      }

      // CRITICAL: Self-Loop Prevention
      // If the message is from the clinician's account itself (owner typing)
      if (businessMsg.from.is_self === true || BigInt(senderId) === clinician.telegramId) {
        console.log(`[Business Msg] Clinician owner intervention detected. Activating AI quiet window (30m).`);
        
        // Log manual message
        await prisma.consultationMessage.create({
          data: {
            consultationId: consultation.id,
            sender: 'CLINICIAN',
            text,
            telegramMessageId: messageId
          }
        });

        // Update lastManualActive timestamp
        await prisma.consultationSession.update({
          where: { id: consultation.id },
          data: { lastManualActive: new Date() }
        });
        return;
      }

      // Check if manual takeover cooldown is currently active (30 minutes)
      const COOLDOWN_WINDOW = 30 * 60 * 1000;
      if (consultation.lastManualActive) {
        const elapsed = Date.now() - new Date(consultation.lastManualActive).getTime();
        if (elapsed < COOLDOWN_WINDOW) {
          const remainingMinutes = Math.round((COOLDOWN_WINDOW - elapsed) / 60000);
          console.log(`[Business Msg] Clinician AI is standing down. Cooldown active for ${remainingMinutes} more mins.`);
          
          // Log message from patient but do not trigger AI
          await prisma.consultationMessage.create({
            data: {
              consultationId: consultation.id,
              sender: 'PATIENT',
              text,
              telegramMessageId: messageId
            }
          });
          return;
        }
      }

      // Log patient's message
      await prisma.consultationMessage.create({
        data: {
          consultationId: consultation.id,
          sender: 'PATIENT',
          text,
          telegramMessageId: messageId
        }
      });

      // Humanize: trigger typing action
      if (clinician.canReply) {
        await (bot.telegram as any).callApi('sendChatAction', {
          chat_id: chatParticipantId.toString(),
          action: 'typing',
          business_connection_id: businessConnectionId
        }).catch(() => {});
      }

      // Add thinking delay to mimic front desk operator
      await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1500));

      // Run Clinician AI Consultation RAG Turn
      const result = await processClinicianConsultationTurn(consultation.id, text);

      // Log clinician's AI reply
      await prisma.consultationMessage.create({
        data: {
          consultationId: consultation.id,
          sender: 'CLINICIAN',
          text: result.replyText
        }
      });

      // Deliver reply via Business Connection
      let delivered = false;
      if (clinician.canReply) {
        try {
          await (bot.telegram as any).callApi('sendMessage', {
            chat_id: chatParticipantId.toString(),
            text: result.replyText,
            business_connection_id: businessConnectionId
          });
          delivered = true;
          console.log(`[Business Msg] Replied to patient ${chatParticipantId} via business connection.`);
        } catch (e: any) {
          console.error(`[Business Msg] Failed to send via business connection: ${e.message}`);
        }
      }

      // Fallback delivery if business connection failed
      if (!delivered) {
        console.warn(`[Business Msg] Using Bot DM relay fallback.`);
        // Notify clinician to send manually
        try {
          await bot.telegram.sendMessage(
            clinician.telegramId.toString(),
            `⚠️ *TenaSync Secretary Warning!*\n\n` +
            `Your AI front desk couldn't auto-send the reply to patient *${consultation.patient.firstName}*.\n\n` +
            `*Please copy and send this message manually inside your chat:*\n\n` +
            `\`${result.replyText}\``,
            { parse_mode: 'Markdown' }
          );
        } catch (err: any) {
          console.error('[Business Msg] Failed to send clinician backup alert:', err.message);
        }

        // Send to patient's Bot DM
        try {
          await bot.telegram.sendMessage(
            chatParticipantId.toString(),
            `🏪 *${clinician.firstName}'s Front Desk:* ${result.replyText}`
          );
        } catch (err: any) {
          console.error('[Business Msg] Failed to send patient backup message:', err.message);
        }
      }

      // Notify the clinician of manual handover if RAG lookup failed
      if (result.fallbackTriggered) {
        try {
          await bot.telegram.sendMessage(
            clinician.telegramId.toString(),
            `⚠️ *TenaSync Handover Alert!*\n\n` +
            `Patient *${consultation.patient.firstName}* asked a symptom question that was not found in your uploaded reference guides:\n\n` +
            `💬 *"${text}"*\n\n` +
            `🤖 *Auto-reply has been paused.* Please respond manually in the chat thread.\n\n` +
            `💡 *To automate this in the future:* Upload/send me a plain text file (\`.txt\`) containing the explanation for this symptom, and I will handle it next time!`
          );
          console.log(`[Business Msg] Handed over consultation ${consultation.id} to clinician ${clinician.firstName} manually.`);
        } catch (err: any) {
          console.error('[Business Msg] Failed to send clinician takeover notification:', err.message);
        }
      }

    } catch (err) {
      console.error('[Business Msg] Error in message handler:', err);
    }
  });
}
