import { DelayedError, UnrecoverableError, type Job, type Queue } from 'bullmq';
import type { DataSource } from 'typeorm';
import type { PinoLogger } from 'nestjs-pino';
import type { CallbackService } from '../../callback/callback.service.js';
import { EnrichConsumer } from './enrich.consumer.js';

describe('EnrichConsumer', () => {
  const data = { item_id: 'item-1', run_id: 'run-1', seq: 1, sku: 'sku-001' };

  function setup(status = 'pending') {
    const item = {
      id: data.item_id,
      run_id: data.run_id,
      seq: data.seq,
      sku: data.sku,
      status,
    };
    const query = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    const database = {
      getRepository: vi.fn(() => ({
        findOneBy: vi.fn().mockResolvedValue(item),
      })),
      createQueryBuilder: vi.fn(() => query),
      transaction: vi.fn(async (callback: (manager: object) => Promise<void>) =>
        callback({ createQueryBuilder: () => query }),
      ),
    };
    const queue = {
      setGlobalConcurrency: vi.fn().mockResolvedValue(undefined),
    };
    const callback = { enqueueIfReady: vi.fn().mockResolvedValue(undefined) };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const consumer = new EnrichConsumer(
      database as unknown as DataSource,
      queue as unknown as Queue,
      logger as unknown as PinoLogger,
      callback as unknown as CallbackService,
    );
    const moveToDelayed = vi.fn(
      async (_time: number, _token?: string) => undefined,
    );
    const job = {
      name: 'enrich-sku',
      data,
      id: data.item_id,
      attemptsMade: 0,
      attemptsStarted: 1,
      opts: { attempts: 5 },
      moveToDelayed,
    } as unknown as Job<typeof data>;
    return { consumer, query, queue, callback, job, moveToDelayed };
  }

  beforeEach(() => {
    vi.stubEnv('PLATFORM_BASE_URL', 'https://platform.invalid/');
    vi.stubEnv('PLATFORM_CID', 'cid-test');
    vi.stubEnv('PLATFORM_TOKEN', 'token-test');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('limita a três concorrentes e não enriquece um item já concluído', async () => {
    const { consumer, queue, callback, job } = setup('completed');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await consumer.onModuleInit();
    await consumer.process(job);
    expect(queue.setGlobalConcurrency).toHaveBeenCalledWith(3);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(callback.enqueueIfReady).toHaveBeenCalledWith(data.run_id);
  });

  it('salva informacoes e verifica se o callback está pronto', async () => {
    const { consumer, query, callback, job } = setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ sku: data.sku, price: 149.9, stock: 42 }),
        ),
    );
    await consumer.process(job);
    expect(query.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        price: '149.9',
        stock: 42,
      }),
    );
    expect(callback.enqueueIfReady).toHaveBeenCalledWith(data.run_id);
  });

  it('http 500 pendente para retry', async () => {
    const { consumer, query, job } = setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );
    await expect(consumer.process(job)).rejects.toThrow('HTTP 500');
    expect(query.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('http 429 conforme Retry-After', async () => {
    const { consumer, job, moveToDelayed } = setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 429, headers: { 'retry-after': '2' } }),
        ),
    );
    const before = Date.now();
    await expect(consumer.process(job, 'lock-token')).rejects.toBeInstanceOf(
      DelayedError,
    );
    expect(moveToDelayed).toHaveBeenCalledWith(
      expect.any(Number),
      'lock-token',
    );
    expect(moveToDelayed.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(
      before + 2000,
    );
  });

  it('http 401 e http 404 como inválido', async () => {
    const unauthorized = setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );
    await expect(
      unauthorized.consumer.process(unauthorized.job),
    ).rejects.toBeInstanceOf(UnrecoverableError);
    expect(unauthorized.query.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );

    const missing = setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    await missing.consumer.process(missing.job);
    expect(missing.query.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'invalid' }),
    );
  });
});
