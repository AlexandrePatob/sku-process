import dataSource from '../src/database/data-source.js';
import { ReportsService } from '../src/process/services/reports.service.js';
import type { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ReportsQueryDto } from '../src/process/dto/reports-query.dto.js';

describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')(
  'ReportsService PostgreSQL (rollback)',
  () => {
    it('deriva estados, contagens, callback, busca e paginação no banco real', async () => {
      await dataSource.initialize();
      const runner = dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        for (const table of ['runs', 'run_items', 'callback_attempts']) {
          await runner.query(
            `CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS) ON COMMIT DROP`,
          );
        }
        const service = new ReportsService({
          getRepository: runner.manager.getRepository.bind(runner.manager),
        } as unknown as DataSource);
        await runner.query(
          `INSERT INTO runs (run_id, expected_total) VALUES ('Pending', 2), ('mixed%_', 2), ('success', 1), ('callback-fail', 1)`,
        );
        await runner.query(`INSERT INTO run_items (run_id, seq, sku, status, started_at, finished_at, price, last_error)
        VALUES ('mixed%_', 0, 'a', 'invalid', now(), now(), NULL, 'SKU inválido (404)'),
        ('mixed%_', 1, 'b', 'pending', NULL, NULL, NULL, NULL),
        ('success', 0, 'c', 'completed', now(), now(), 12.90, NULL),
        ('callback-fail', 0, 'd', 'completed', now(), now(), 20.00, NULL)`);
        expect(await service.getRun('Pending')).toMatchObject({
          status: 'pending',
          report: null,
        });
        expect(await service.getRun('mixed%_')).toMatchObject({
          status: 'processing',
          completed_count: 1,
          invalid_count: 1,
          report: null,
        });
        await runner.query(
          `UPDATE run_items SET status = 'failed', started_at = now(), finished_at = now(), last_error = 'final' WHERE run_id = 'mixed%_' AND seq = 1`,
        );
        expect(await service.getRun('mixed%_')).toMatchObject({
          status: 'failed',
          completed_count: 2,
          failed_count: 1,
          callback_status: 'not_applicable',
          report: null,
        });
        expect(await service.getRun('success')).toMatchObject({
          status: 'processing',
          callback_status: 'pending',
        });
        await runner.query(
          `INSERT INTO callback_attempts (run_id, status, finished_at, error, response_body) VALUES ('success', 'completed', now(), NULL, '{"ok":true,"score":100}'), ('callback-fail', 'failed', now(), 'HTTP 503', 'Serviço indisponível')`,
        );
        expect(await service.getRun('success')).toMatchObject({
          status: 'completed',
          report: '{"ok":true,"score":100}',
        });
        expect(await service.getRun('callback-fail')).toMatchObject({
          status: 'processing',
          callback_status: 'pending',
        });
        await runner.query(
          `UPDATE runs SET status = 'failed', finished_at = now() WHERE run_id = 'callback-fail'`,
        );
        expect(await service.getRun('callback-fail')).toMatchObject({
          status: 'failed',
          callback_status: 'failed',
          error: 'HTTP 503',
          report: 'Serviço indisponível',
        });
        expect(
          await service.getReports(
            plainToInstance(ReportsQueryDto, { run_id: '%_' }),
          ),
        ).toMatchObject({
          pagination: { total: 1 },
        });
        expect(
          await service.getReports(
            plainToInstance(ReportsQueryDto, { status: 'processing' }),
          ),
        ).toMatchObject({ pagination: { total: 1 } });
        expect(
          await service.getReports(
            plainToInstance(ReportsQueryDto, { page: '10', limit: '1' }),
          ),
        ).toEqual({
          data: [],
          pagination: { page: 10, limit: 1, total: 4, total_pages: 4 },
        });
        expect(
          await service.getReports(
            plainToInstance(ReportsQueryDto, { run_id: 'not-found' }),
          ),
        ).toMatchObject({ data: [], pagination: { total: 0, total_pages: 0 } });
      } finally {
        await runner.rollbackTransaction();
        await runner.release();
        await dataSource.destroy();
      }
    });
  },
);
