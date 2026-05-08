import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger.js";

/**
 * Limit bets per IP
 * Allows max 10 bets per 15 second window (standard round duration)
 */
export const betRateLimiter = rateLimit({
  windowMs: 15 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Too many bets from this IP. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for bets: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * Limit cashouts per IP
 * Allows max 5 cashout attempts per second
 */
export const cashoutRateLimiter = rateLimit({
  windowMs: 1000,
  max: 5,
  message: {
    success: false,
    error: "Too many cashout attempts. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for cashouts: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * General API rate limiter for wallet-based requests
 * Allows max 100 requests per minute
 */
export const walletRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    // Use wallet address if available, fallback to IP
    return (req.body?.address || req.query?.address || req.ip) as string;
  },
  message: {
    success: false,
    error: "Too many requests. Please try again in a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
