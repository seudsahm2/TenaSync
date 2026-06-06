import { Telegraf } from 'telegraf';
import { config } from '../../config/index.js';

export function setupGuestMode(bot: Telegraf) {
  // Catch guest messages using middleware
  bot.use(async (ctx, next) => {
    const update = ctx.update as any;
    if (!update.guest_message) return next();

    console.log('[Guest Mode] Intercepted raw guest message update:', JSON.stringify(update.guest_message));

    const { guest_query_id, message } = update.guest_message;
    const incomingText: string = message.text || '';
    const userId = message.from?.id;

    // Clinical keywords evaluation for physical/spine strain
    const spineKeywords = ['stiff', 'back', 'neck', 'spine', 'ቁስል', 'ወገብ', 'ትከሻ', 'ከባድ'];
    const isSpineStrain = spineKeywords.some(kw => incomingText.toLowerCase().includes(kw));

    let responseText = 'How can we assist you with your somatic health journey today? Tap below to access your secure command center.';
    if (isSpineStrain) {
      responseText = "I detected physical strain related to back/neck stiffness. This often correlates to C3-C7 cervical joint compression or lumbar loads. Let's analyze this securely in private.";
    }

    try {
      console.log(`[Guest Mode] Sending answerGuestQuery for query ID: ${guest_query_id}`);
      
      const tmaUrl = `${config.TMA_URL}/diagnostics.html?user_id=${userId}&mode=stealth`;
      
      await (bot.telegram as any).callApi('answerGuestQuery', {
        guest_query_id: guest_query_id,
        message: {
          text: responseText,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔬 Scan Posture & Spine Privately (TMA)',
                  web_app: { url: tmaUrl }
                }
              ]
            ]
          }
        }
      });
      console.log('[Guest Mode] successfully replied with answerGuestQuery');
    } catch (error) {
      console.error('[Guest Mode Error] Failed to resolve answerGuestQuery hook:', error);
    }
  });
}
