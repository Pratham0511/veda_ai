import { Queue } from 'bullmq';
import { bullMQRedisOptions } from '../config/redis.js';

// Each BullMQ Queue needs its own connection — pass options, not an ioredis instance
export const assignmentQueue = new Queue('assignment-generation', {
  connection: bullMQRedisOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

console.log('BullMQ assignment queue initialized');

