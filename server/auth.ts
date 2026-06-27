import type { Request, Response, NextFunction } from "express";

// Password from environment — default is the user-specified password
export const APP_PASSWORD = process.env.APP_PASSWORD || "ASHIK123456789@00";

// Simple in-memory rate limiter: max 10 failed attempts per IP per 15 minutes
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export function getRateLimitStatus(ip: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    return { allowed: true, remaining: MAX_ATTEMPTS, resetInSeconds: 0 };
  }

  const remaining = MAX_ATTEMPTS - entry.count;
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: remaining > 0, remaining: Math.max(0, remaining), resetInSeconds };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailedAttempts(ip: string) {
  failedAttempts.delete(ip);
}

// Middleware: require authenticated session
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (sess.authenticated === true) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Declare session fields on the express-session namespace
declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    loginAt: number;
  }
}
