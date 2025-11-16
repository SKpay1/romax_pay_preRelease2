import type { Request, Response } from 'express';
import { storage } from '../storage';
import { validateTelegramWebAppData } from '../utils/telegram';

/**
 * Get or create user based on Telegram data
 * Endpoint: POST /api/user/auth
 */
export async function authenticateUser(req: Request, res: Response) {
  try {
    const { initData, telegramId, username } = req.body;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // If initData is provided, validate it
    if (initData) {
      const botToken = process.env.BOT_TOKEN;
      
      if (!botToken) {
        console.error('BOT_TOKEN is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const validatedData = validateTelegramWebAppData(initData, botToken);
      
      if (!validatedData || !validatedData.user) {
        return res.status(401).json({ error: 'Invalid Telegram authentication data' });
      }

      // Extract user info from validated initData
      const tgUser = validatedData.user;
      const tgId = tgUser.id.toString();
      const tgUsername = tgUser.username || tgUser.first_name || `user_${tgUser.id}`;

      // Try to find existing user
      let user = await storage.getUserByTelegramId(tgId);

      // Create new user if doesn't exist
      if (!user) {
        user = await storage.createUser({
          telegramId: tgId,
          username: tgUsername,
          availableBalance: '0',
          frozenBalance: '0',
        });
      }

      return res.json({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        availableBalance: parseFloat(user.availableBalance),
        frozenBalance: parseFloat(user.frozenBalance),
        registeredAt: user.registeredAt,
      });
    }

    // Demo mode fallback - ONLY in development without initData
    if (isDevelopment && telegramId) {
      console.warn('Running in DEMO MODE - no initData validation performed');
      
      // Try to find existing user
      let user = await storage.getUserByTelegramId(telegramId.toString());

      // Create new user if doesn't exist
      if (!user) {
        user = await storage.createUser({
          telegramId: telegramId.toString(),
          username: username || `user_${telegramId}`,
          availableBalance: '0',
          frozenBalance: '0',
        });
      }

      return res.json({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        availableBalance: parseFloat(user.availableBalance),
        frozenBalance: parseFloat(user.frozenBalance),
        registeredAt: user.registeredAt,
      });
    }

    // No initData provided and not in development mode
    return res.status(401).json({ 
      error: 'Telegram authentication required. Please provide initData.' 
    });
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user balance
 * Endpoint: GET /api/user/:userId/balance
 */
export async function getUserBalance(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      availableBalance: parseFloat(user.availableBalance),
      frozenBalance: parseFloat(user.frozenBalance),
    });
  } catch (error) {
    console.error('Error getting user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
