import type { Express } from "express";
import { createServer, type Server } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";

// Controllers
import { authenticateUser, getUserBalance } from "./controllers/userController";
import { getUserPaymentRequests, getPaymentRequest, createPaymentRequest, updatePaymentRequestStatus } from "./controllers/paymentController";
import { getUserNotifications, markNotificationAsRead, getUnreadNotificationsCount } from "./controllers/notificationController";
import { adminLogin, getAllUsers, getAllPaymentRequests, updateUserBalance, addUserDeposit, approvePaymentRequest, cancelPaymentRequest, processPaymentRequest, getPaymentRequestForAdmin, getAllOperators, createOperator, updateOperatorStatus, deleteOperator } from "./controllers/adminController";
import { createDeposit, createAutomatedDeposit, getUserDeposits, getPendingDeposits, confirmDeposit, rejectDeposit } from "./controllers/depositController";
import { operatorLogin, getPaymentRequestsForOperator, operatorProcessPayment } from "./controllers/operatorController";
import { handleWebhook, verifyWebhook } from "./telegram/webhooks";

// Middleware
import { requireOperatorAuth } from "./middleware/operatorAuth";

// Services
import { getCurrentExchangeRate } from "./services/exchangeRate";

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for Replit environment
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow Telegram WebApp
  }));

  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://telegram.org', process.env.REPLIT_DOMAINS || '']
      : '*',
    credentials: true,
  }));

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development for polling
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // User routes
  app.post('/api/user/auth', authenticateUser);
  app.get('/api/user/:userId/balance', getUserBalance);

  // Payment routes
  app.get('/api/payments/user/:userId', getUserPaymentRequests);
  app.get('/api/payments/:requestId', getPaymentRequest);
  app.post('/api/payments/create', createPaymentRequest);
  app.patch('/api/payments/:requestId/status', updatePaymentRequestStatus);

  // Notification routes
  app.get('/api/notifications/user/:userId', getUserNotifications);
  app.get('/api/notifications/user/:userId/unread-count', getUnreadNotificationsCount);
  app.patch('/api/notifications/:notificationId/read', markNotificationAsRead);

  // Deposit routes
  app.post('/api/deposits/create-automated', createAutomatedDeposit);
  app.post('/api/deposits/create', createDeposit);
  app.get('/api/deposits/user/:userId', getUserDeposits);

  // Exchange rate endpoint - Real CBR rates
  app.get('/api/exchange-rate', (_req, res) => {
    const exchangeRateData = getCurrentExchangeRate();
    res.json(exchangeRateData);
  });

  // Admin routes
  app.post('/api/admin/login', adminLogin);
  app.get('/api/admin/users', getAllUsers);
  app.get('/api/admin/payments', getAllPaymentRequests);
  app.get('/api/admin/payments/:id', getPaymentRequestForAdmin);
  app.post('/api/admin/user/:userId/balance', updateUserBalance);
  app.post('/api/admin/user/:userId/deposit', addUserDeposit);
  app.post('/api/admin/payment/:requestId/approve', approvePaymentRequest);
  app.post('/api/admin/payment/:requestId/cancel', cancelPaymentRequest);
  app.patch('/api/admin/payments/:id/process', processPaymentRequest);
  app.get('/api/admin/deposits/pending', getPendingDeposits);
  app.post('/api/admin/deposits/:depositId/confirm', confirmDeposit);
  app.post('/api/admin/deposits/:depositId/reject', rejectDeposit);
  
  // Admin operator management routes
  app.get('/api/admin/operators', getAllOperators);
  app.post('/api/admin/operators', createOperator);
  app.patch('/api/admin/operators/:id/status', updateOperatorStatus);
  app.delete('/api/admin/operators/:id', deleteOperator);

  // Operator routes
  app.post('/api/operator/login', operatorLogin);
  app.get('/api/operator/:operatorId/payments', requireOperatorAuth, getPaymentRequestsForOperator);
  app.patch('/api/operator/:operatorId/payments/:requestId/process', requireOperatorAuth, operatorProcessPayment);

  // Telegram webhook routes
  app.post('/telegram/webhook', handleWebhook);
  app.get('/telegram/webhook', verifyWebhook);

  const httpServer = createServer(app);

  return httpServer;
}
