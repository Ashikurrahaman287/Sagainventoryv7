import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startTelegramBot } from "./telegram";

const MemoryStoreSession = MemoryStore(session);

const app = express();

// Trust proxy for proper cookie handling behind reverse proxies
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware — HttpOnly cookie, auto-pruned in-memory store
const SESSION_SECRET = process.env.SESSION_SECRET || "saga-inventory-default-secret-change-in-prod";
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86_400_000, // prune expired sessions every 24h
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8-hour session
    },
    name: "saga.sid",
  })
);

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

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
      if (logLine.length > 100) logLine = logLine.slice(0, 99) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Telegram bot — purely optional, never throws, never blocks HTTP
  try {
    startTelegramBot();
  } catch (err: any) {
    console.warn("[telegram] Bot failed to initialise:", err.message);
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (status >= 500) {
      console.error("[error]", err);
    }
    res.status(status).json({ error: message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
