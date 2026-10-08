import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Run } from '../process/entities/run.entity.js';
import { RunItem } from '../process/entities/run-item.entity.js';
import { CallbackAttempt } from './entities/callback-attempt.entity.js';

@Processor('callback')
export class CallbackConsumer extends WorkerHost {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @InjectPinoLogger(CallbackConsumer.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<{ run_id: string }>): Promise<void> {
    if (job.name !== 'send-callback') {
      throw new UnrecoverableError('Tipo de job desconhecido');
    }

    const runId = job.data.run_id;
    const run = await this.database
      .getRepository(Run)
      .findOneBy({ run_id: runId });
    if (!run) {
      throw new UnrecoverableError('Lote não encontrado');
    }
    if (run.status === 'completed') return;

    const items = await this.database.getRepository(RunItem).find({
      where: { run_id: runId, status: 'completed' },
      order: { seq: 'ASC' },
    });
    if (!run.expected_total || items.length !== run.expected_total) {
      throw new Error('Lote incompleto');
    }

    const baseUrl = process.env.PLATFORM_BASE_URL;
    const cid = process.env.PLATFORM_CID;
    const token = process.env.PLATFORM_TOKEN;

    const attempt = await this.database.getRepository(CallbackAttempt).save({
      run_id: runId,
      status: 'processing',
    });

    try {
      if (!baseUrl || !cid || !token) {
        throw new UnrecoverableError('Configuração da plataforma ausente');
      }
      const response = await fetch(
        new URL('callback', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-token': token },
          body: JSON.stringify({
            cid,
            run_id: runId,
            result: items.map(({ seq, sku, price, stock }) => ({
              seq,
              sku,
              price: Number(price),
              stock,
            })),
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const responseBody = await response.text();
      await this.database.getRepository(CallbackAttempt).update(attempt.id, {
        http_status: response.status,
        response_body: responseBody,
      });
      if (!response.ok) {
        throw new Error(`Callback respondeu HTTP ${response.status}`);
      }

      await this.database.getRepository(CallbackAttempt).update(attempt.id, {
        status: 'completed',
        finished_at: new Date(),
      });
      await this.database.getRepository(Run).update(
        { run_id: runId },
        {
          status: 'completed',
          finished_at: new Date(),
          updated_at: new Date(),
        },
      );
      this.logger.info({ run_id: runId, job_id: job.id }, 'Callback entregue');
    } catch (error) {
      await this.database.getRepository(CallbackAttempt).update(attempt.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        finished_at: new Date(),
      });
      if (
        error instanceof UnrecoverableError ||
        (job.attemptsMade ?? 0) + 1 >= (job.opts?.attempts ?? 5)
      ) {
        await this.database.getRepository(Run).update(
          { run_id: runId },
          {
            status: 'failed',
            finished_at: new Date(),
            updated_at: new Date(),
          },
        );
      }
      this.logger.error(
        { err: error, run_id: runId, job_id: job.id },
        'Falha no callback',
      );
      throw error;
    }
  }
}
