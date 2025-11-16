import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebAppData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

/**
 * Validates Telegram WebApp initData
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string, botToken: string): TelegramWebAppData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return null;
    }

    params.delete('hash');
    
    // Create data-check-string
    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // Compute secret key
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    
    // Compute hash
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) {
      return null;
    }

    // Parse user data
    const userStr = params.get('user');
    const authDate = parseInt(params.get('auth_date') || '0', 10);

    // Check if auth_date is not too old (24 hours)
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return null;
    }

    return {
      query_id: params.get('query_id') || undefined,
      user: userStr ? JSON.parse(userStr) : undefined,
      auth_date: authDate,
      hash,
    };
  } catch (error) {
    console.error('Error validating Telegram WebApp data:', error);
    return null;
  }
}

/**
 * Extracts user info from Telegram WebApp initData (for testing without validation)
 */
export function parseTelegramWebAppData(initData: string): TelegramWebAppData | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const hash = params.get('hash') || '';

    return {
      query_id: params.get('query_id') || undefined,
      user: userStr ? JSON.parse(userStr) : undefined,
      auth_date: authDate,
      hash,
    };
  } catch (error) {
    console.error('Error parsing Telegram WebApp data:', error);
    return null;
  }
}
