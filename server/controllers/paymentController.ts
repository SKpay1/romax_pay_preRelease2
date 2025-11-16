import type { Request, Response } from 'express';
import { storage } from '../storage';
import type { Attachment } from '@shared/schema';

/**
 * Get payment requests for a user
 * Endpoint: GET /api/payments/user/:userId
 */
export async function getUserPaymentRequests(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const requests = await storage.getPaymentRequestsByUserId(userId);

    const formatted = requests.map(req => ({
      id: req.id,
      amountRub: parseFloat(req.amountRub),
      amountUsdt: parseFloat(req.amountUsdt),
      frozenRate: parseFloat(req.frozenRate),
      urgency: req.urgency,
      hasUrgentFee: req.hasUrgentFee === 1,
      usdtFrozen: parseFloat(req.amountUsdt),
      attachments: req.attachments as Attachment[] || [],
      comment: req.comment || '',
      status: req.status,
      // receipt is admin-only, not exposed to regular users
      receipt: req.status === 'paid' ? req.receipt || undefined : undefined,
      createdAt: req.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error getting payment requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get single payment request
 * Endpoint: GET /api/payments/:requestId
 */
export async function getPaymentRequest(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const request = await storage.getPaymentRequest(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    // Note: receipt field is not exposed through this public endpoint
    // Users can see receipts through /api/payments/user/:userId (ownership verified)
    // Admins can see receipts through /api/admin/payments/:id (password protected)
    res.json({
      id: request.id,
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments as Attachment[] || [],
      comment: request.comment || '',
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error getting payment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create new payment request
 * Endpoint: POST /api/payments/create
 */
export async function createPaymentRequest(req: Request, res: Response) {
  try {
    const { userId, amountRub, amountUsdt, frozenRate, urgency, attachments, comment } = req.body;

    if (!userId || !amountRub || !amountUsdt || !frozenRate || !urgency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user to check balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const availableBalance = parseFloat(user.availableBalance);
    const requestAmount = parseFloat(amountUsdt);

    if (availableBalance < requestAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create payment request
    const request = await storage.createPaymentRequest({
      userId,
      amountRub: amountRub.toString(),
      amountUsdt: amountUsdt.toString(),
      frozenRate: frozenRate.toString(),
      urgency,
      hasUrgentFee: urgency === 'urgent' ? 1 : 0,
      attachments: attachments || [],
      comment: comment || null,
      status: 'submitted',
    });

    // Update user balance (freeze USDT)
    const newAvailableBalance = (availableBalance - requestAmount).toFixed(8);
    const frozenBalance = parseFloat(user.frozenBalance);
    const newFrozenBalance = (frozenBalance + requestAmount).toFixed(8);

    await storage.updateUserBalance(userId, newAvailableBalance, newFrozenBalance);

    // Create notification
    await storage.createNotification({
      userId,
      requestId: request.id,
      message: `Заявка на ${parseFloat(amountRub).toLocaleString('ru-RU')} ₽ создана`,
      isRead: 0,
    });

    res.json({
      id: request.id,
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments as Attachment[] || [],
      comment: request.comment || '',
      status: request.status,
      receipt: request.receipt || undefined,
      createdAt: request.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update payment request status (simulate payment / cancel)
 * Endpoint: PATCH /api/payments/:requestId/status
 */
export async function updatePaymentRequestStatus(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['submitted', 'processing', 'paid', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await storage.updatePaymentRequestStatus(requestId, status);

    // Update balances based on status
    let message = '';
    if (status === 'paid') {
      // Release frozen funds
      const frozenBalance = parseFloat(user.frozenBalance);
      const requestAmount = parseFloat(request.amountUsdt);
      const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);
      await storage.updateUserBalance(request.userId, user.availableBalance, newFrozenBalance);
      message = `Заявка №${request.id.slice(-6)} оплачена`;
    } else if (status === 'cancelled' || status === 'rejected') {
      // Return frozen funds to available balance
      const availableBalance = parseFloat(user.availableBalance);
      const frozenBalance = parseFloat(user.frozenBalance);
      const requestAmount = parseFloat(request.amountUsdt);
      const newAvailableBalance = (availableBalance + requestAmount).toFixed(8);
      const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);
      await storage.updateUserBalance(request.userId, newAvailableBalance, newFrozenBalance);
      message = `Заявка №${request.id.slice(-6)} ${status === 'cancelled' ? 'отменена' : 'отклонена'}. Средства возвращены.`;
    } else {
      message = `Статус заявки №${request.id.slice(-6)} изменен: ${status}`;
    }

    // Create notification
    await storage.createNotification({
      userId: request.userId,
      requestId: request.id,
      message,
      isRead: 0,
    });

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error updating payment request status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
