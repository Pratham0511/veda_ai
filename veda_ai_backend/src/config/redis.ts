import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Parse REDIS_URL into connection options.
// BullMQ uses its own bundled ioredis internally — passing options (not an instance)
// avoids the dual-ioredis type conflict and is the officially recommended pattern.
function parseRedisOptions() {
  const url = new URL(redisUrl);
  const isTLS = redisUrl.startsWith('rediss://');

  return {
    host: url.hostname,
    port: parseInt(url.port) || (isTLS ? 6380 : 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null as null, // required by BullMQ
    enableReadyCheck: false,            // required for Upstash
    ...(isTLS ? { tls: {} } : {}),
  };
}

// Export options object — used by BullMQ Queue and Worker
export const bullMQRedisOptions = parseRedisOptions();

// Separate ioredis instance for non-BullMQ use (health check, etc.)
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
});

redisConnection.on('connect', () => console.log('[Redis] Connected'));
redisConnection.on('error', (err) => console.error('[Redis] Error:', err.message));

