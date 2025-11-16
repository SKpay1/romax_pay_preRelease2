import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeBot, setupMenuButton, setupWebhook } from "./telegram/bot";
import { startExchangeRateService } from "./services/exchangeRate";
import { startDepositExpirationService } from "./services/depositExpiration";
import { startBlockchainScanner } from "./services/blockchainScanner";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);

    // Initialize exchange rate service
    try {
      log('Starting exchange rate service...');
      await startExchangeRateService();
      log('Exchange rate service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize exchange rate service:', error);
    }

    // Initialize deposit expiration service
    try {
      log('Starting deposit expiration service...');
      await startDepositExpirationService();
      log('Deposit expiration service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize deposit expiration service:', error);
    }

    // Initialize blockchain scanner
    try {
      log('Starting TRON blockchain scanner...');
      await startBlockchainScanner();
      log('Blockchain scanner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize blockchain scanner:', error);
    }

    // Initialize Telegram bot if token is provided
    if (process.env.BOT_TOKEN) {
      try {
        log('Initializing Telegram bot...');
        initializeBot(process.env.BOT_TOKEN);

        // Set up WebApp URL - use Replit domain for both dev and production
        const webAppUrl = process.env.WEBAPP_URL || 
          (process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : `http://localhost:${port}`
          );

        log(`WebApp URL: ${webAppUrl}`);

        // Set up menu button
        await setupMenuButton(webAppUrl);

        // Set up webhook in production
        if (process.env.NODE_ENV === 'production' && process.env.REPLIT_DOMAINS) {
          const webhookUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/telegram/webhook`;
          await setupWebhook(webhookUrl);
          log(`Telegram webhook set to: ${webhookUrl}`);
        }

        log('Telegram bot initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Telegram bot:', error);
      }
    } else {
      log('BOT_TOKEN not set, Telegram bot will not be initialized');
    }
  });
})();
