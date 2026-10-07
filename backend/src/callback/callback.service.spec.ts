import type { DataSource } from 'typeorm';
import type { Queue } from 'bullmq';
import { CallbackService } from './callback.service.js';

describe('CallbackService', () => {
  it('publica só após 20 itens concluídos e usa run_id como jobId', async () => {
    let completed = 19;
    const database = {
      getRepository: () => ({ countBy: vi.fn(async () => completed) }),
    };
    const queue = { add: vi.fn(async () => undefined) };
    const service = new CallbackService(
      database as unknown as DataSource,
      queue as unknown as Queue,
    );

    await service.enqueueIfReady('run-1');
    expect(queue.add).not.toHaveBeenCalled();

    completed = 20;
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
