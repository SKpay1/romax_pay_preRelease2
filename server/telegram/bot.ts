import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;

export function initializeBot(token: string): TelegramBot {
  if (bot) {
    return bot;
  }

  bot = new TelegramBot(token, { polling: false });

  // Set up bot commands
  bot.setMyCommands([
    { command: 'start', description: 'Открыть приложение' },
  ]);

  return bot;
}

export function getBot(): TelegramBot {
  if (!bot) {
    throw new Error('Bot not initialized. Call initializeBot first.');
  }
  return bot;
}

/**
 * Configure the WebApp menu button for the bot
 */
export async function setupMenuButton(webAppUrl: string) {
  const botInstance = getBot();
  
  try {
    await botInstance.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: 'Открыть приложение',
        web_app: {
          url: webAppUrl,
        },
      },
    });
    console.log('Menu button configured successfully');
  } catch (error) {
    console.error('Error setting up menu button:', error);
  }
}

/**
 * Set up webhook for the bot
 */
export async function setupWebhook(webhookUrl: string) {
  const botInstance = getBot();
  
  try {
    await botInstance.setWebHook(webhookUrl);
    console.log(`Webhook set to: ${webhookUrl}`);
  } catch (error) {
    console.error('Error setting webhook:', error);
    throw error;
  }
}

/**
 * Get webhook info
 */
export async function getWebhookInfo() {
  const botInstance = getBot();
  return await botInstance.getWebHookInfo();
}

/**
 * Remove webhook (useful for local development)
 */
export async function removeWebhook() {
  const botInstance = getBot();
  try {
    await botInstance.deleteWebHook();
    console.log('Webhook removed');
  } catch (error) {
    console.error('Error removing webhook:', error);
  }
}

/**
 * Send notification to user via Telegram
 */
export async function sendNotificationToUser(telegramId: string, message: string) {
  try {
    const botInstance = getBot();
    await botInstance.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
    });
    console.log(`Notification sent to Telegram user ${telegramId}`);
  } catch (error) {
    console.error(`Error sending notification to Telegram user ${telegramId}:`, error);
    // Don't throw error - notification failure shouldn't break the flow
  }
}
