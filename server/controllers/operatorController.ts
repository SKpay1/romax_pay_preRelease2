import type { Request, Response } from 'express';
import { storage } from '../storage';
import { verifyPasswordWithSalt } from '../utils/password';

export async function operatorLogin(req: Request, res: Response) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ message: 'Логин и пароль обязательны' });
    }

    const operator = await storage.getOperatorByLogin(login);
    
    if (!operator) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    if (operator.isActive === 0) {
      return res.status(403).json({ message: 'Аккаунт оператора деактивирован' });
    }

    const isPasswordValid = verifyPasswordWithSalt(password, operator.salt, operator.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    if (req.session) {
      req.session.operatorId = operator.id;
    }

    res.json({
      id: operator.id,
      login: operator.login,
      createdAt: operator.createdAt,
    });
  } catch (error) {
    console.error('Operator login error:', error);
    res.status(500).json({ message: 'Ошибка входа' });
  }
}

export async function getPaymentRequestsForOperator(req: Request, res: Response) {
  try {
    const { operatorId } = req.params;
    const { status } = req.query;

    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    let requests = await storage.getAllPaymentRequests();

    if (status && status !== 'all') {
      requests = requests.filter(r => r.status === status);
    }

    const requestsWithUsernames = await Promise.all(
      requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return {
          ...request,
          username: user?.username || 'Unknown',
        };
      })
    );

    res.json(requestsWithUsernames);
  } catch (error) {
    console.error('Get payment requests error:', error);
    res.status(500).json({ message: 'Ошибка загрузки заявок' });
  }
}

export async function operatorProcessPayment(req: Request, res: Response) {
  try {
    const { operatorId, requestId } = req.params;
    const { status, adminComment, receipt, amountRub } = req.body;

    const operator = await storage.getOperator(operatorId);
    if (!operator || operator.isActive === 0) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (!['paid', 'rejected', 'processing'].includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    const updates: any = { status };
    if (adminComment) updates.adminComment = adminComment;
    if (receipt) updates.receipt = receipt;
    if (amountRub) updates.amountRub = amountRub;

    await storage.updatePaymentRequestFull(requestId, updates);

    if (status === 'paid' || status === 'rejected') {
      const user = await storage.getUser(request.userId);
      if (user) {
        if (status === 'paid') {
          const newFrozen = parseFloat(user.frozenBalance) - parseFloat(request.amountUsdt);
          await storage.updateUserBalance(
            request.userId,
            user.availableBalance,
            newFrozen.toString()
          );
        } else if (status === 'rejected') {
          const newAvailable = parseFloat(user.availableBalance) + parseFloat(request.amountUsdt);
          const newFrozen = parseFloat(user.frozenBalance) - parseFloat(request.amountUsdt);
          await storage.updateUserBalance(
            request.userId,
            newAvailable.toString(),
            newFrozen.toString()
          );
        }

        await storage.createNotification({
          userId: request.userId,
          requestId: request.id,
          message: status === 'paid' 
            ? `Ваша заявка на ${request.amountRub} ₽ оплачена`
            : `Ваша заявка на ${request.amountRub} ₽ отклонена`,
        });
      }
    }

    res.json({ message: 'Заявка обработана' });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Ошибка обработки заявки' });
  }
}
