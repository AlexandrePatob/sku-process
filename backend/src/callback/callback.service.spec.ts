import type { DataSource } from 'typeorm';
import type { Queue } from 'bullmq';
import { CallbackService } from './callback.service.js';
import { Run } from '../process/entities/run.entity.js';

describe('CallbackService', () => {
  it('publica só após o total esperado e usa run_id como jobId', async () => {
    let completed = 2;
    const database = {
      getRepository: (entity: unknown) => entity === Run
        ? { findOneBy: vi.fn(async () => ({ expected_total: 3 })) }
        : { countBy: vi.fn(async () => completed) },
    };
    const queue = { add: vi.fn(async () => undefined) };
    const service = new CallbackService(
      database as unknown as DataSource,
      queue as unknown as Queue,
    );

    await service.enqueueIfReady('run-1');
    expect(queue.add).not.toHaveBeenCalled();

    completed = 3;
    await service.enqueueIfReady('run-1');
    await service.enqueueIfReady('run-1');
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith(
      'send-callback',
      { run_id: 'run-1' },
      expect.objectContaining({ jobId: 'run-1', removeOnComplete: false }),
    );
  });
});
