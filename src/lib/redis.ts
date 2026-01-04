import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Cliente Redis singleton
const createRedisClient = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("Redis not configured - queue operations will be no-op");
    return null;
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
};

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Queue name for SNP analysis jobs
const QUEUE_NAME = "snp-analysis-queue";

/**
 * Encola un job para procesamiento
 */
export async function enqueueJob(jobId: string): Promise<void> {
  if (!redis) {
    console.warn("Redis not configured - job not enqueued:", jobId);
    return;
  }
  await redis.lpush(QUEUE_NAME, jobId);
}

/**
 * Obtiene la longitud de la cola
 */
export async function getQueueLength(): Promise<number> {
  if (!redis) {
    return 0;
  }
  return await redis.llen(QUEUE_NAME);
}

/**
 * Obtiene la posición de un job en la cola (aproximada)
 */
export async function getJobPosition(jobId: string): Promise<number | null> {
  if (!redis) {
    return null;
  }

  const queue = await redis.lrange(QUEUE_NAME, 0, -1);
  const position = queue.indexOf(jobId);
  return position === -1 ? null : queue.length - position;
}

// ============================================
// Rate Limiting
// ============================================

/**
 * Rate limiter para análisis de secuencias
 * 10 requests por minuto por usuario
 */
export const analysisRatelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "1m"),
      prefix: "ratelimit:analysis",
    })
  : null;

/**
 * Rate limiter general para API
 * 100 requests por minuto por usuario
 */
export const apiRatelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(100, "1m"),
      prefix: "ratelimit:api",
    })
  : null;

/**
 * Verifica rate limit y lanza error si se excede
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null = apiRatelimit
): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) {
    return { success: true, remaining: -1 };
  }

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
  };
}
