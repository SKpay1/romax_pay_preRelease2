import type { Request, Response } from 'express';
import { getBot } from './bot';

/**
 * Handle incoming webhook updates from Telegram
 * Endpoint: POST /telegram/webhook
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const update = req.body;
    const bot = getBot();

    // Handle /start command
    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id;
      
      // Get WebApp URL from Replit domains or environment variable
      const webAppUrl = process.env.WEBAPP_URL || 
        (process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : ''
        );

      // Guard against empty WebApp URL - critical to prevent 500 errors
      if (!webAppUrl) {
        console.error('[Webhook] CRITICAL: WebApp URL is not configured. Set WEBAPP_URL or REPLIT_DOMAINS environment variable.');
        await bot.sendMessage(chatId, 'Добро пожаловать в Romax Pay! 💰\n\nПриложение временно недоступно. Пожалуйста, попробуйте позже.');
        return res.json({ ok: false, reason: 'webapp_url_missing' });
      }

      await bot.sendMessage(chatId, 'Добро пожаловать в Romax Pay! 💰', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть приложение',
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      });
    }

    // Handle callback queries
    if (update.callback_query) {
      await bot.answerCallbackQuery(update.callback_query.id);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify webhook setup
 * Endpoint: GET /telegram/webhook
 */
export async function verifyWebhook(_req: Request, res: Response) {
  try {
    const bot = getBot();
    const info = await bot.getWebHookInfo();
    res.json({
      url: info.url,
      hasCustomCertificate: info.has_custom_certificate,
      pendingUpdateCount: info.pending_update_count,
      lastErrorDate: info.last_error_date,
      lastErrorMessage: info.last_error_message,
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
