import type { Request, Response, NextFunction } from 'express';

export function requireOperatorAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.operatorId) {
    return res.status(401).json({ message: 'Требуется авторизация оператора' });
  }
  
  next();
}
