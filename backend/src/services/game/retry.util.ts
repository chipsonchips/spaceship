import { logger } from '../../utils/logger.js';

const RETRYABLE_PATTERNS = [
  'serialization',
  'serializable',
  'context has been closed',
  'SERIALIZATION_FAILURE',
  'connection',
  'timeout',
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'too many clients',
  'pool',
];

const RETRYABLE_PG_CODES = new Set(['40P01', '40001', '57014']); // deadlock, serialization, query canceled

export function isRetryableDbError(error: unknown): boolean {
  const err = error as Error & { code?: string; driverError?: { code?: string } };
  const message = (err.message || String(error)).toLowerCase();

  if (RETRYABLE_PATTERNS.some((p) => message.includes(p.toLowerCase()))) {
    return true;
  }

  const code = err.code ?? err.driverError?.code;
  return code !== undefined && RETRYABLE_PG_CODES.has(code);
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    label?: string;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const label = options.label ?? 'db-operation';

  const run = async (attempt: number): Promise<T> => {
    try {
      return await operation();
    } catch (error: unknown) {
      const err = error as Error;
      const retryable = isRetryableDbError(error);

      if (attempt >= maxRetries || !retryable) {
        logger.error('Database operation failed', {
          label,
          attempt,
          maxRetries,
          retryable,
          error: err.message,
        });
        throw error;
      }

      const delayMs = Math.min(
        2000,
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100,
      );

      logger.warn('Database operation retrying', {
        label,
        attempt,
        maxRetries,
        nextRetryInMs: Math.round(delayMs),
        error: err.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return run(attempt + 1);
    }
  };

  return run(1);
}
