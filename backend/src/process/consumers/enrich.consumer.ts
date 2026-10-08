import { Inject, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { DelayedError, Job, Queue, UnrecoverableError } from 'bullmq';
import { DataSource, In } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RunItem } from '../entities/run-item.entity.js';
import { Run } from '../entities/run.entity.js';
import { CallbackService } from '../../callback/callback.service.js';

type EnrichJob = { run_id: string; seq: number; sku: string; item_id: string };
type EnrichResult = { sku: string; price: number; stock: number };

const concurrency = Number(process.env.ENRICH_CONCURRENCY ?? 3);
if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('ENRICH_CONCURRENCY deve ser um inteiro positivo');
}

@Processor('processing', { concurrency })
export class EnrichConsumer extends WorkerHost implements OnModuleInit {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @InjectQueue('processing') private readonly queue: Queue,
    @InjectPinoLogger(EnrichConsumer.name) private readonly logger: PinoLogger,
    @Inject(CallbackService) private readonly callbackService: CallbackService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.setGlobalConcurrency(concurrency);
  }

  async process(job: Job<EnrichJob>, token?: string): Promise<void> {
    if (job.name !== 'enrich-sku') {
      throw new UnrecoverableError('Tipo de job desconhecido');
    }

    const item = await this.loadItem(job.data);
    if (item.status === 'completed') {
      await this.callbackService.enqueueIfReady(item.run_id);
      return;
    }
    if (item.status === 'invalid') return;

    const { item_id, run_id, seq, sku } = job.data;
    const started = await this.database
      .createQueryBuilder()
      .update(RunItem)
      .set({
        attempts: () => 'attempts + 1',
        status: 'processing',
        started_at: () => 'COALESCE(started_at, now())',
        updated_at: () => 'now()',
      })
      .where({ id: item_id, status: In(['pending', 'processing']) })
      .execute();
    if (!started.affected) return;

    this.logger.info(
      { run_id, seq, sku, attempt: job.attemptsStarted },
      'Consultando preço e estoque',
    );

    try {
      const response = await this.requestEnrichment(sku);
      if (response.status === 429) {
        await this.delay(job, response, token);
      }
      if (response.status === 401) {
        throw new UnrecoverableError('Credencial inválida na plataforma');
      }
      if (response.status === 404) {
        await this.finish(item, {
          status: 'invalid',
          last_error: 'SKU inválido (404)',
        });
        this.logger.warn({ run_id, seq, sku }, 'SKU inválido');
        return;
      }
      if (!response.ok) {
        throw new Error(`Plataforma respondeu HTTP ${response.status}`);
      }

      const data = (await response.json()) as EnrichResult;
      if (
        data.sku !== sku ||
        typeof data.price !== 'number' ||
        typeof data.stock !== 'number'
      ) {
        throw new UnrecoverableError('Resposta de enriquecimento inválida');
      }
      await this.finish(item, {
        status: 'completed',
        price: String(data.price),
        stock: data.stock,
        last_error: null,
      });
      this.logger.info(
        { run_id, seq, sku, price: data.price, stock: data.stock },
        'Informacoes do item recuperadas com sucesso',
      );
    } catch (error) {
      if (error instanceof DelayedError) throw error;
      await this.markFailure(item_id, job, error);
      throw error;
    }
  }

  private async loadItem(data: EnrichJob): Promise<RunItem> {
    const item = await this.database
      .getRepository(RunItem)
      .findOneBy({ id: data.item_id });
    if (
      !item ||
      item.run_id !== data.run_id ||
      item.seq !== data.seq ||
      item.sku !== data.sku
    ) {
      throw new UnrecoverableError('Job sem item correspondente');
    }
    return item;
  }

  private async requestEnrichment(sku: string): Promise<Response> {
    const baseUrl = process.env.PLATFORM_BASE_URL;
    const cid = process.env.PLATFORM_CID;
    const token = process.env.PLATFORM_TOKEN;
    if (!baseUrl || !cid || !token) {
      throw new UnrecoverableError('Configuração da plataforma ausente');
    }

    const url = new URL(
      `enrich/${encodeURIComponent(sku)}`,
      baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
    );
    return fetch(url, {
      headers: { 'x-cid': cid, 'x-token': token },
      signal: AbortSignal.timeout(5000),
    });
  }

  private async delay(
    job: Job<EnrichJob>,
    response: Response,
    token?: string,
  ): Promise<never> {
    if (job.attemptsStarted >= (job.opts.attempts ?? 5)) {
      throw new UnrecoverableError('Limite de tentativas após resposta 429');
    }
    const header = response.headers.get('retry-after');
    const seconds = header === null ? NaN : Number(header);
    const date = header === null ? NaN : Date.parse(header);
    const wait =
      Number.isFinite(seconds) && seconds >= 0
        ? seconds * 1000
        : Number.isFinite(date)
          ? date - Date.now()
          : 1000;
    const delay = Math.max(1000, Math.ceil(wait));

    await job.moveToDelayed(Date.now() + delay, token);
    this.logger.warn(
      { job_id: job.id, delay_ms: delay },
      'Limite externo atingido; aguardando Retry-After',
    );
    throw new DelayedError();
  }

  private async markFailure(
    itemId: string,
    job: Job<EnrichJob>,
    error: unknown,
  ): Promise<void> {
    const final =
      error instanceof UnrecoverableError ||
      job.attemptsMade + 1 >= (job.opts.attempts ?? 5);
    const messageError = error instanceof Error ? error.message : String(error);
    await this.database
      .createQueryBuilder()
      .update(RunItem)
      .set({
        status: final ? 'failed' : 'pending',
        finished_at: final ? () => 'now()' : null,
        last_error: messageError,
        updated_at: () => 'now()',
      })
      .where({ id: itemId, status: 'processing' })
      .execute();
    this.logger.error(
      { err: error, job_id: job.id, ...job.data, final },
      'Falha no enriquecimento',
    );
  }

  private async finish(item: RunItem, update: Partial<RunItem>): Promise<void> {
    await this.database.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(RunItem)
        .set({
          ...update,
          finished_at: () => 'now()',
          updated_at: () => 'now()',
        })
        .where({ id: item.id, status: 'processing' })
        .execute();
      if (!result.affected) return;

      await manager
        .createQueryBuilder()
        .update(Run)
        .set({
          completed_count: () => 'completed_count + 1',
          updated_at: () => 'now()',
        })
        .where({ run_id: item.run_id })
        .execute();
    });
    await this.callbackService.enqueueIfReady(item.run_id);
  }
}
