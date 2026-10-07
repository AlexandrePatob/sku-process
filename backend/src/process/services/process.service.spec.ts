import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { Queue } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import { ProcessService } from './process.service.js';

describe('ProcessService', () => {
  const message = { run_id: 'run-1', seq: 7, sku: 'sku-001' };

  function setup(status = 'pending', sku = message.sku) {
    const item = { id: 'item-1', ...message, sku, status };
    const query = {
      insert: vi.fn().mockReturnThis(),
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      orIgnore: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const manager = {
      createQueryBuilder: vi.fn(() => query),
      findOneByOrFail: vi.fn().mockResolvedValue(item),
    };
    const database = {
      transaction: vi.fn(
        async (callback: (manager: object) => Promise<unknown>) =>
          callback(manager),
      ),
    };
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const service = new ProcessService(
      database as unknown as DataSource,
      queue as unknown as Queue,
      logger as unknown as PinoLogger,
    );
    return { service, database, manager, query, queue };
  }

  it('persiste antes de publicar com o id do item', async () => {
    const { service, database, query, queue } = setup();
    await service.receive(message);
    expect(database.transaction).toHaveBeenCalledOnce();
    expect(query.execute).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith(
      'enrich-sku',
      { ...message, item_id: 'item-1' },
      expect.objectContaining({ jobId: 'item-1', attempts: 5 }),
    );
  });

  it('reutiliza o jobId e ignora item já concluído', async () => {
    const repeated = setup();
    await repeated.service.receive(message);
    await repeated.service.receive(message);
    expect(repeated.queue.add).toHaveBeenCalledTimes(2);
    expect(repeated.queue.add).toHaveBeenCalledWith(
      'enrich-sku',
      expect.anything(),
      expect.objectContaining({ jobId: 'item-1' }),
    );

    const completed = setup('completed');
    await completed.service.receive(message);
    expect(completed.queue.add).not.toHaveBeenCalled();
  });

  it('rejeita mesmo run_id e seq com outro SKU', async () => {
    const { service, queue } = setup('pending', 'outro-sku');
    await expect(service.receive(message)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('não responde sucesso se banco ou fila falharem', async () => {
    const db = setup();
    db.database.transaction.mockRejectedValueOnce(
      new Error('banco indisponível'),
    );
    await expect(db.service.receive(message)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(db.queue.add).not.toHaveBeenCalled();

    const redis = setup();
    redis.queue.add.mockRejectedValueOnce(new Error('fila indisponível'));
    await expect(redis.service.receive(message)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
