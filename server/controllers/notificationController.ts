import type { Request, Response } from 'express';
import { storage } from '../storage';

/**
 * Get notifications for a user
 * Endpoint: GET /api/notifications/user/:userId
 */
export async function getUserNotifications(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const notifications = await storage.getNotificationsByUserId(userId);

    const formatted = notifications.map(notif => ({
      id: notif.id,
      requestId: notif.requestId,
      message: notif.message,
      isRead: notif.isRead === 1,
      createdAt: notif.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark notification as read
 * Endpoint: PATCH /api/notifications/:notificationId/read
 */
export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;
    await storage.markNotificationAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get unread notifications count
 * Endpoint: GET /api/notifications/user/:userId/unread-count
 */
export async function getUnreadNotificationsCount(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const count = await storage.getUnreadNotificationsCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
