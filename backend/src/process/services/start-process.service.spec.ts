import type { DataSource } from 'typeorm';
import { StartProcessService } from './start-process.service.js';
import type { CallbackService } from '../../callback/callback.service.js';

describe('StartProcessService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('salva o total recebido antes de verificar o callback', async () => {
    vi.stubEnv('PLATFORM_BASE_URL', 'https://platform.invalid/');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ run_id: 'run-1', total: 3 }));
    vi.stubGlobal('fetch', fetchMock);

    const upsert = vi.fn().mockResolvedValue(undefined);
    const enqueueIfReady = vi.fn().mockResolvedValue(undefined);
    const database = { getRepository: () => ({ upsert }) };
    const service = new StartProcessService(
      database as unknown as DataSource,
      { enqueueIfReady } as unknown as CallbackService,
    );

    await expect(service.start('cid-1', 'token-1')).resolves.toEqual({
      run_id: 'run-1',
      total: 3,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://platform.invalid/burst/cid-1'),
      { method: 'POST', headers: { 'x-token': 'token-1' } },
    );
    expect(upsert).toHaveBeenCalledWith(
      { run_id: 'run-1', expected_total: 3 },
      ['run_id'],
    );
    expect(upsert.mock.invocationCallOrder[0]).toBeLessThan(
      enqueueIfReady.mock.invocationCallOrder[0],
    );
  });
});
