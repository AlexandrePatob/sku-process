import type { Job } from 'bullmq';
import type { DataSource } from 'typeorm';
import type { PinoLogger } from 'nestjs-pino';
import { Run } from '../process/entities/run.entity.js';
import { RunItem } from '../process/entities/run-item.entity.js';
import { CallbackAttempt } from './entities/callback-attempt.entity.js';
import { CallbackConsumer } from './callback.consumer.js';

describe('CallbackConsumer', () => {
  const job = {
    id: 'run-1',
    name: 'send-callback',
    data: { run_id: 'run-1' },
  } as Job<{ run_id: string }>;

  function setup(status = 'pending') {
    const items = Array.from({ length: 20 }, (_, seq) => ({
      seq,
      sku: `sku-${seq}`,
      price: String(seq + 0.5),
      stock: seq,
    }));
    const runs = {
      findOneBy: vi.fn().mockResolvedValue({ status, expected_total: 20 }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const runItems = { find: vi.fn().mockResolvedValue(items) };
    const attempts = {
      save: vi.fn().mockResolvedValue({ id: 'attempt-1' }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const database = {
      getRepository: vi.fn((entity) => {
        if (entity === Run) return runs;
        if (entity === RunItem) return runItems;
        if (entity === CallbackAttempt) return attempts;
        throw new Error('Tabela inesperada');
      }),
    };
    const logger = { info: vi.fn(), error: vi.fn() };
    const consumer = new CallbackConsumer(
      database as unknown as DataSource,
      logger as unknown as PinoLogger,
    );
    return { consumer, runs, runItems, attempts };
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

  it('envia os 20 resultados em ordem e registra sucesso', async () => {
    const { consumer, runs, runItems, attempts } = setup();
    let payload: { result: Array<{ seq: number }> } | undefined;
    const fetchMock = vi.fn(async (_url: URL, options: RequestInit) => {
      if (typeof options.body !== 'string') throw new Error('Body ausente');
      payload = JSON.parse(options.body);
      return Response.json({ ok: true, score: 100 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await consumer.process(job);
    expect(runItems.find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { seq: 'ASC' } }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://platform.invalid/callback'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-token': 'token-test' }),
      }),
    );
    expect(payload?.result.map(({ seq }) => seq)).toEqual(
      Array.from({ length: 20 }, (_, seq) => seq),
    );
    expect(attempts.update).toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({ status: 'completed' }),
    );
    expect(runs.update).toHaveBeenCalledWith(
      { run_id: 'run-1' },
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('registra resposta de erro para retry', async () => {
    const { consumer, runs, attempts } = setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('erro', { status: 503 })),
    );
    await expect(consumer.process(job)).rejects.toThrow('HTTP 503');
    expect(attempts.update).toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({ http_status: 503, response_body: 'erro' }),
    );
    expect(attempts.update).toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({ status: 'failed' }),
    );
    expect(runs.update).not.toHaveBeenCalled();
  });

  it('não reenvia lote já concluído', async () => {
    const { consumer, attempts } = setup('completed');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await consumer.process(job);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(attempts.save).not.toHaveBeenCalled();
  });

  it('encerra o lote ao esgotar as tentativas do callback', async () => {
    const { consumer, runs } = setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('erro', { status: 503 })),
    );
    await expect(
      consumer.process({
        ...job,
        attemptsMade: 4,
        opts: { attempts: 5 },
      } as Job<{ run_id: string }>),
    ).rejects.toThrow('HTTP 503');
    expect(runs.update).toHaveBeenCalledWith(
      { run_id: 'run-1' },
      expect.objectContaining({
        status: 'failed',
        finished_at: expect.any(Date),
      }),
    );
  });
});
