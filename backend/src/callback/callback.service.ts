import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { RunItem } from '../process/entities/run-item.entity.js';
import { Run } from '../process/entities/run.entity.js';

@Injectable()
export class CallbackService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @InjectQueue('callback') private readonly queue: Queue,
  ) {}

  async enqueueIfReady(runId: string): Promise<void> {
    const run = await this.database.getRepository(Run).findOneBy({ run_id: runId });
    if (!run?.expected_total) return;

    const completed = await this.database.getRepository(RunItem).countBy({
      run_id: runId,
      status: 'completed',
    });
    if (completed !== run.expected_total) return;

    await this.queue.add(
      'send-callback',
      { run_id: runId },
      {
        jobId: runId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }
}
