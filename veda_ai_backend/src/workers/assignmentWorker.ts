import { Worker } from 'bullmq';
import { bullMQRedisOptions } from '../config/redis.js';
import { generateQuestionPaper } from '../services/geminiService.js';
import { emitToUser } from '../config/websocket.js';
import Assignment from '../models/Assignment.js';

const STEPS = [
  'Parsing reference materials...',
  'Structuring custom question paper schema...',
  'Generating questions using Veda AI model...',
  'Formulating answers and rubrics...',
  'Finalizing assignment output...',
];

export function startAssignmentWorker() {
  const worker = new Worker(
    'assignment-generation',
    async (job) => {
      const { assignmentId, userId, config } = job.data;

      try {
        // Step 1-4: emit progress events
        for (let i = 0; i < STEPS.length - 1; i++) {
          await job.updateProgress(Math.round(((i + 1) / STEPS.length) * 100));
          emitToUser(userId, 'job:progress', {
            assignmentId,
            step: i,
            message: STEPS[i],
            percent: Math.round(((i + 1) / STEPS.length) * 100),
          });
          await delay(400); // simulate realistic pacing
        }

        // Step 5: actual generation
        emitToUser(userId, 'job:progress', {
          assignmentId,
          step: STEPS.length - 1,
          message: STEPS[STEPS.length - 1],
          percent: 90,
        });

        const result = await generateQuestionPaper(config);

        // Persist to MongoDB
        const updated = await Assignment.findByIdAndUpdate(
          assignmentId,
          {
            sections: result.sections,
            totalMarks: result.totalMarks,
            totalQuestions: result.totalQuestions,
            status: 'completed',
          },
          { new: true }
        );

        // Notify frontend — done!
        emitToUser(userId, 'job:done', {
          assignmentId,
          assignment: {
            id: updated._id,
            title: updated.title,
            subject: updated.subject,
            sections: updated.sections,
            totalMarks: updated.totalMarks,
            totalQuestions: updated.totalQuestions,
            status: updated.status,
            createdAt: updated.createdAt,
            dueDate: updated.dueDate,
          },
        });

        return { success: true };
      } catch (err: any) {
        console.error(`Worker error for assignment ${assignmentId}:`, err.message);

        // Mark as failed in DB
        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'failed',
          error: err.message,
        });

        // Notify frontend of failure
        emitToUser(userId, 'job:failed', {
          assignmentId,
          error: err.message,
        });

        throw err;
      }
    },
    {
      connection: bullMQRedisOptions, // options object, not a Redis instance
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err: any) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log('Assignment generation worker started');
  return worker;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
