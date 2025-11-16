import type { Request, Response } from 'express';
import { storage } from '../storage';
import { sendNotificationToUser } from '../telegram/bot';
import { generateSalt, hashPasswordWithSalt } from '../utils/password';

/**
 * Admin password verification helper
 * 
 * IMPORTANT: Set ADMIN_PASSWORD in Replit Secrets for production
 * Default password for testing: "admin123"
 * 
 * To set in Replit:
 * 1. Open "Tools" -> "Secrets"
 * 2. Add key: ADMIN_PASSWORD
 * 3. Add value: your-secure-password
 */
function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return password === adminPassword;
}

/**
 * Admin login
 * Endpoint: POST /api/admin/login
 */
export async function adminLogin(req: Request, res: Response) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all users with their balances
 * Endpoint: GET /api/admin/users
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const { password } = req.query;

    if (!password || !verifyAdminPassword(password as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allUsers = await storage.getAllUsers();

    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      availableBalance: parseFloat(user.availableBalance),
      frozenBalance: parseFloat(user.frozenBalance),
      registeredAt: user.registeredAt.toISOString(),
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all payment requests with optional filters
 * Endpoint: GET /api/admin/payments
 */
export async function getAllPaymentRequests(req: Request, res: Response) {
  try {
    const { password, status, userId, urgency } = req.query;

    if (!password || !verifyAdminPassword(password as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let requests = await storage.getAllPaymentRequests();

    // Apply filters
    if (status && status !== 'all') {
      requests = requests.filter(r => r.status === status);
    }
    if (userId) {
      requests = requests.filter(r => r.userId === userId);
    }
    if (urgency && urgency !== 'all') {
      requests = requests.filter(r => r.urgency === urgency);
    }

    // Get user data for each request
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return {
          id: request.id,
          userId: request.userId,
          username: user?.username || 'Unknown',
          amountRub: parseFloat(request.amountRub),
          amountUsdt: parseFloat(request.amountUsdt),
          frozenRate: parseFloat(request.frozenRate),
          urgency: request.urgency,
          status: request.status,
          createdAt: request.createdAt.toISOString(),
        };
      })
    );

    res.json(requestsWithUsers);
  } catch (error) {
    console.error('Error getting all payment requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update user balance
 * Endpoint: POST /api/admin/user/:userId/balance
 */
export async function updateUserBalance(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { password, availableBalance, frozenBalance } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (availableBalance === undefined || frozenBalance === undefined) {
      return res.status(400).json({ error: 'Both availableBalance and frozenBalance are required' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await storage.updateUserBalance(
      userId,
      availableBalance.toString(),
      frozenBalance.toString()
    );

    // Create notification
    await storage.createNotification({
      userId,
      message: `Администратор изменил ваш баланс. Доступно: ${availableBalance} USDT, Заморожено: ${frozenBalance} USDT`,
      isRead: 0,
    });

    res.json({ success: true, message: 'Balance updated successfully' });
  } catch (error) {
    console.error('Error updating user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add deposit to user (increase available balance)
 * Endpoint: POST /api/admin/user/:userId/deposit
 */
export async function addUserDeposit(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { password, amount } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid deposit amount is required' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentAvailable = parseFloat(user.availableBalance);
    const newAvailable = (currentAvailable + amount).toFixed(8);

    await storage.updateUserBalance(userId, newAvailable, user.frozenBalance);

    // Create notification
    await storage.createNotification({
      userId,
      message: `Пополнение счета: +${amount} USDT. Новый баланс: ${newAvailable} USDT`,
      isRead: 0,
    });

    res.json({ 
      success: true, 
      message: 'Deposit added successfully',
      newBalance: parseFloat(newAvailable)
    });
  } catch (error) {
    console.error('Error adding deposit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve payment request
 * Move frozen USDT to deducted, update status to "paid"
 * Endpoint: POST /api/admin/payment/:requestId/approve
 */
export async function approvePaymentRequest(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const { password } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (request.status === 'paid') {
      return res.status(400).json({ error: 'Payment request already paid' });
    }

    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update payment status to paid
    await storage.updatePaymentRequestStatus(requestId, 'paid');

    // Release frozen funds (move from frozen to deducted)
    const frozenBalance = parseFloat(user.frozenBalance);
    const requestAmount = parseFloat(request.amountUsdt);
    const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);

    await storage.updateUserBalance(request.userId, user.availableBalance, newFrozenBalance);

    // Create notification
    await storage.createNotification({
      userId: request.userId,
      requestId: request.id,
      message: `Заявка №${request.id.slice(-6)} одобрена и оплачена. Сумма: ${parseFloat(request.amountRub).toLocaleString('ru-RU')} ₽`,
      isRead: 0,
    });

    res.json({ 
      success: true, 
      message: 'Payment request approved and paid'
    });
  } catch (error) {
    console.error('Error approving payment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Cancel payment request
 * Return frozen funds to available balance
 * Endpoint: POST /api/admin/payment/:requestId/cancel
 */
export async function cancelPaymentRequest(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const { password } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (request.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel paid request' });
    }

    if (request.status === 'cancelled') {
      return res.status(400).json({ error: 'Payment request already cancelled' });
    }

    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update payment status to cancelled
    await storage.updatePaymentRequestStatus(requestId, 'cancelled');

    // Return frozen funds to available balance
    const availableBalance = parseFloat(user.availableBalance);
    const frozenBalance = parseFloat(user.frozenBalance);
    const requestAmount = parseFloat(request.amountUsdt);

    const newAvailableBalance = (availableBalance + requestAmount).toFixed(8);
    const newFrozenBalance = Math.max(0, frozenBalance - requestAmount).toFixed(8);

    await storage.updateUserBalance(request.userId, newAvailableBalance, newFrozenBalance);

    // Create notification
    await storage.createNotification({
      userId: request.userId,
      requestId: request.id,
      message: `Заявка №${request.id.slice(-6)} отменена администратором. Средства возвращены на счет.`,
      isRead: 0,
    });

    res.json({ 
      success: true, 
      message: 'Payment request cancelled, funds returned to user'
    });
  } catch (error) {
    console.error('Error cancelling payment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get payment request details for admin
 * Endpoint: GET /api/admin/payments/:id
 */
export async function getPaymentRequestForAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { password } = req.query;

    // Verify admin password
    if (!password || !verifyAdminPassword(password as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request = await storage.getPaymentRequest(id);
    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    // Get user data
    const user = await storage.getUser(request.userId);

    res.json({
      id: request.id,
      userId: request.userId,
      username: user?.username || 'Unknown',
      amountRub: parseFloat(request.amountRub),
      amountUsdt: parseFloat(request.amountUsdt),
      frozenRate: parseFloat(request.frozenRate),
      urgency: request.urgency,
      hasUrgentFee: request.hasUrgentFee === 1,
      usdtFrozen: parseFloat(request.amountUsdt),
      attachments: request.attachments || [],
      comment: request.comment || '',
      status: request.status,
      receipt: request.receipt || null,
      adminComment: request.adminComment || '',
      createdAt: request.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error getting payment request for admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process payment request with receipt attachment and notifications
 * Endpoint: PATCH /api/admin/payments/:id/process
 */
export async function processPaymentRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { password, status, receipt, adminComment, newAmountRub } = req.body;

    // Verify admin password
    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate status
    if (!['paid', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "paid" or "rejected"' });
    }

    // Validate receipt if provided
    if (receipt) {
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!receipt.mimeType || !allowedMimeTypes.includes(receipt.mimeType)) {
        return res.status(400).json({ error: 'Invalid receipt mime type. Allowed: PDF, JPG, PNG' });
      }
      
      // Check base64 size (approximate file size in bytes)
      const base64Length = receipt.value?.length || 0;
      const approximateFileSize = (base64Length * 3) / 4;
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (approximateFileSize > maxSize) {
        return res.status(400).json({ error: 'Receipt file too large. Maximum size: 10MB' });
      }

      if (!receipt.name || !receipt.type) {
        return res.status(400).json({ error: 'Receipt must include name and type' });
      }
    }

    // Get payment request
    const request = await storage.getPaymentRequest(id);
    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    // Check if already processed
    if (request.status === 'paid' || request.status === 'rejected') {
      return res.status(400).json({ error: `Payment request already ${request.status}` });
    }

    // Get user
    const user = await storage.getUser(request.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Handle amount change if provided (only validate and update request, balance update happens later)
    let finalAmountRub = parseFloat(request.amountRub);
    let finalAmountUsdt = parseFloat(request.amountUsdt);
    const frozenRate = parseFloat(request.frozenRate);
    let amountAdjustmentUsdt = 0;

    if (newAmountRub && Math.abs(newAmountRub - finalAmountRub) > 0.01) {
      // Calculate new USDT amount using the frozen rate from the original request
      const newAmountUsdt = newAmountRub / frozenRate;
      const oldAmountUsdt = parseFloat(request.amountUsdt);
      amountAdjustmentUsdt = newAmountUsdt - oldAmountUsdt;

      // Validate available balance if amount increased
      if (amountAdjustmentUsdt > 0.00000001) {
        const availableBalance = parseFloat(user.availableBalance);
        if (availableBalance < amountAdjustmentUsdt) {
          return res.status(400).json({ 
            error: `Недостаточно баланса клиента. Доступно: ${availableBalance.toFixed(2)} USDT, требуется дополнительно: ${amountAdjustmentUsdt.toFixed(2)} USDT. Отмените заявку.`,
            insufficientBalance: true,
            available: availableBalance.toFixed(2),
            required: amountAdjustmentUsdt.toFixed(2)
          });
        }
      }

      finalAmountRub = newAmountRub;
      finalAmountUsdt = newAmountUsdt;
    }

    // Update payment request with all changes
    const updates: any = { status };
    if (receipt) updates.receipt = receipt;
    if (adminComment) updates.adminComment = adminComment;
    if (newAmountRub && Math.abs(newAmountRub - parseFloat(request.amountRub)) > 0.01) {
      updates.amountRub = finalAmountRub.toFixed(2);
      updates.amountUsdt = finalAmountUsdt.toFixed(8);
    }

    await storage.updatePaymentRequestFull(id, updates);

    // Update user balance based on amount adjustment and status
    let frozenBalance = parseFloat(user.frozenBalance);
    let availableBalance = parseFloat(user.availableBalance);

    // First, apply amount adjustment to freeze/unfreeze the difference
    if (amountAdjustmentUsdt !== 0) {
      if (amountAdjustmentUsdt > 0) {
        // Amount increased - freeze additional USDT from available balance
        availableBalance -= amountAdjustmentUsdt;
        frozenBalance += amountAdjustmentUsdt;
      } else {
        // Amount decreased - unfreeze excess USDT back to available balance
        const excessUsdt = Math.abs(amountAdjustmentUsdt);
        availableBalance += excessUsdt;
        frozenBalance -= excessUsdt;
      }
    }

    const requestAmount = finalAmountUsdt;
    let notificationMessage = '';
    let telegramMessage = '';

    if (status === 'paid') {
      // Release frozen funds (deduct from frozen balance)
      frozenBalance = Math.max(0, frozenBalance - requestAmount);
      await storage.updateUserBalance(request.userId, availableBalance.toFixed(8), frozenBalance.toFixed(8));
      
      notificationMessage = `Заявка №${request.id.slice(-6)} оплачена. Сумма: ${finalAmountRub.toLocaleString('ru-RU')} ₽`;
      if (adminComment) {
        notificationMessage += `\nКомментарий: ${adminComment}`;
      }
      
      telegramMessage = `✅ <b>Заявка оплачена</b>\n\n` +
        `Заявка №${request.id.slice(-6)} успешно оплачена.\n` +
        `Сумма: ${finalAmountRub.toLocaleString('ru-RU')} ₽\n` +
        `USDT: ${finalAmountUsdt.toFixed(2)} USDT`;
      if (adminComment) {
        telegramMessage += `\n\n💬 Комментарий оператора: ${adminComment}`;
      }
    } else if (status === 'rejected') {
      // Return frozen funds to available balance
      availableBalance += requestAmount;
      frozenBalance = Math.max(0, frozenBalance - requestAmount);
      await storage.updateUserBalance(request.userId, availableBalance.toFixed(8), frozenBalance.toFixed(8));
      
      notificationMessage = `Заявка №${request.id.slice(-6)} отклонена. Средства возвращены на счет.`;
      if (adminComment) {
        notificationMessage += `\nПричина: ${adminComment}`;
      }
      
      telegramMessage = `❌ <b>Заявка отклонена</b>\n\n` +
        `Заявка №${request.id.slice(-6)} была отклонена.\n` +
        `Сумма: ${finalAmountRub.toLocaleString('ru-RU')} ₽\n` +
        `Средства в размере ${finalAmountUsdt.toFixed(2)} USDT возвращены на ваш баланс.`;
      if (adminComment) {
        telegramMessage += `\n\n💬 Причина отказа: ${adminComment}`;
      }
    }

    // Create in-app notification
    await storage.createNotification({
      userId: request.userId,
      requestId: request.id,
      message: notificationMessage,
      isRead: 0,
    });

    // Send Telegram notification to user
    try {
      await sendNotificationToUser(user.telegramId, telegramMessage);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      // Continue even if Telegram notification fails
    }

    // Fetch updated payment request to return to client
    const updatedRequest = await storage.getPaymentRequest(id);
    if (!updatedRequest) {
      return res.status(500).json({ error: 'Failed to fetch updated payment request' });
    }

    res.json({ 
      success: true, 
      message: `Payment request ${status}`,
      paymentRequest: {
        id: updatedRequest.id,
        userId: updatedRequest.userId,
        username: user.username,
        amountRub: parseFloat(updatedRequest.amountRub),
        amountUsdt: parseFloat(updatedRequest.amountUsdt),
        frozenRate: parseFloat(updatedRequest.frozenRate),
        urgency: updatedRequest.urgency,
        hasUrgentFee: updatedRequest.hasUrgentFee === 1,
        usdtFrozen: parseFloat(updatedRequest.amountUsdt),
        attachments: updatedRequest.attachments || [],
        comment: updatedRequest.comment || '',
        status: updatedRequest.status,
        receipt: updatedRequest.receipt || null,
        createdAt: updatedRequest.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error processing payment request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all operators
 * Endpoint: GET /api/admin/operators
 */
export async function getAllOperators(req: Request, res: Response) {
  try {
    const { password } = req.query;

    if (!password || !verifyAdminPassword(password as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const operators = await storage.getAllOperators();

    const formattedOperators = operators.map(op => ({
      id: op.id,
      login: op.login,
      isActive: op.isActive === 1,
      createdAt: op.createdAt.toISOString(),
    }));

    res.json(formattedOperators);
  } catch (error) {
    console.error('Error getting operators:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create operator
 * Endpoint: POST /api/admin/operators
 */
export async function createOperator(req: Request, res: Response) {
  try {
    const { password, login, operatorPassword } = req.body;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!login || !operatorPassword) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const existingOperator = await storage.getOperatorByLogin(login);
    if (existingOperator) {
      return res.status(400).json({ error: 'Логин уже используется' });
    }

    const salt = generateSalt();
    const passwordHash = hashPasswordWithSalt(operatorPassword, salt);

    const operator = await storage.createOperator({
      login,
      passwordHash,
      salt,
      isActive: 1,
    });

    res.json({
      id: operator.id,
      login: operator.login,
      isActive: operator.isActive === 1,
      createdAt: operator.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating operator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update operator status (activate/deactivate)
 * Endpoint: PATCH /api/admin/operators/:id/status
 */
export async function updateOperatorStatus(req: Request, res: Response) {
  try {
    const { password, isActive } = req.body;
    const { id } = req.params;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    await storage.updateOperatorStatus(id, isActive ? 1 : 0);

    res.json({ success: true, message: 'Статус оператора обновлен' });
  } catch (error) {
    console.error('Error updating operator status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete operator
 * Endpoint: DELETE /api/admin/operators/:id
 */
export async function deleteOperator(req: Request, res: Response) {
  try {
    const { password } = req.body;
    const { id } = req.params;

    if (!password || !verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await storage.deleteOperator(id);

    res.json({ success: true, message: 'Оператор удален' });
  } catch (error) {
    console.error('Error deleting operator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
