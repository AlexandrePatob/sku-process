import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Run } from '../entities/run.entity.js';
import { RunItem } from '../entities/run-item.entity.js';
import { CallbackAttempt } from '../../callback/entities/callback-attempt.entity.js';
import type {
  RunSummary,
  RunReport,
  ReportsResponse,
} from '../dto/report.dto.js';
import type { ReportsQueryDto } from '../dto/reports-query.dto.js';

@Injectable()
export class ReportsService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  async getRun(runId: string): Promise<RunReport> {
    const run = await this.read(() =>
      this.database.getRepository(Run).findOneBy({ run_id: runId }),
    );
    if (!run) throw new NotFoundException('Lote não encontrado');
    const [items, callback] = await this.read(() =>
      Promise.all([
        this.database.getRepository(RunItem).find({
          where: { run_id: runId },
          select: {
            seq: true,
            status: true,
            last_error: true,
            started_at: true,
            finished_at: true,
            updated_at: true,
          },
        }),
        this.database.getRepository(CallbackAttempt).findOne({
          where: { run_id: runId },
          order: { started_at: 'DESC', id: 'DESC' },
        }),
      ]),
    );
    const summary = this.summarize(run, items, callback);
    return {
      ...summary,
      report: ['completed', 'failed'].includes(summary.status)
        ? (callback?.response_body ?? null)
        : null,
    };
  }

  async getReports(query: ReportsQueryDto): Promise<ReportsResponse> {
    const { page, limit } = query;
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset))
      throw new BadRequestException('page fora do intervalo permitido');
    // ponytail: derived-state filtering uses memory; move aggregation to the database if history grows large.
    const runs = await this.read(() =>
      this.database
        .getRepository(Run)
        .find({ order: { created_at: 'DESC', run_id: 'DESC' } }),
    );
    const search = query.run_id?.toLowerCase();
    const matching = runs.filter(
      (run) => !search || run.run_id.toLowerCase().includes(search),
    );
    const ids = matching.map((run) => run.run_id);
    const [items, callbacks] = ids.length
      ? await this.read(() =>
          Promise.all([
            this.database.getRepository(RunItem).find({
              where: { run_id: In(ids) },
              select: {
                run_id: true,
                seq: true,
                status: true,
                last_error: true,
                started_at: true,
                finished_at: true,
                updated_at: true,
              },
              order: { seq: 'ASC' },
            }),
            this.database.getRepository(CallbackAttempt).find({
              where: { run_id: In(ids) },
              order: { started_at: 'DESC', id: 'DESC' },
            }),
          ]),
        )
      : [[], []];
    const itemsByRun = new Map<string, RunItem[]>();
    for (const item of items) {
      const group = itemsByRun.get(item.run_id) ?? [];
      group.push(item);
      itemsByRun.set(item.run_id, group);
    }
    const callbackByRun = new Map<string, CallbackAttempt>();
    for (const callback of callbacks)
      if (!callbackByRun.has(callback.run_id))
        callbackByRun.set(callback.run_id, callback);
    const data = matching
      .map((run) =>
        this.summarize(
          run,
          itemsByRun.get(run.run_id) ?? [],
          callbackByRun.get(run.run_id) ?? null,
        ),
      )
      .filter(
        (run) =>
          !query.status ||
          run.status === query.status ||
          (query.status === 'processing' && run.status === 'pending'),
      );
    return {
      data: data.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total: data.length,
        total_pages: Math.ceil(data.length / limit),
      },
    };
  }

  private summarize(
    run: Run,
    items: RunItem[],
    callback: CallbackAttempt | null,
  ): RunSummary {
    const success = items.filter((item) => item.status === 'completed').length;
    const invalid = items.filter((item) => item.status === 'invalid').length;
    const failed = items.filter((item) => item.status === 'failed').length;
    const completed = success + invalid + failed;
    const allDone =
      run.expected_total !== null &&
      items.length === run.expected_total &&
      completed === run.expected_total;
    const starts = items.flatMap((item) =>
      item.started_at ? [item.started_at.getTime()] : [],
    );
    const started =
      run.started_at ?? (starts.length ? new Date(Math.min(...starts)) : null);
    const status =
      allDone && (invalid + failed > 0 || run.status === 'failed')
        ? 'failed'
        : allDone &&
            (run.status === 'completed' || callback?.status === 'completed')
          ? 'completed'
          : started || callback
            ? 'processing'
            : 'pending';
    const itemFinished = items.map((item) =>
      (item.finished_at ?? item.updated_at).getTime(),
    );
    const finished = ['completed', 'failed'].includes(status)
      ? (run.finished_at ??
        (invalid + failed === 0 ? callback?.finished_at : null) ??
        (itemFinished.length ? new Date(Math.max(...itemFinished)) : null))
      : null;
    const updated = [
      run.updated_at,
      ...items.map((item) => item.updated_at),
      callback?.started_at,
      callback?.finished_at,
    ].filter((date): date is Date => date != null);
    return {
      run_id: run.run_id,
      status,
      total: run.expected_total,
      received_count: items.length,
      completed_count: completed,
      success_count: success,
      invalid_count: invalid,
      failed_count: failed,
      created_at: run.created_at.toISOString(),
      started_at: started?.toISOString() ?? null,
      finished_at: finished?.toISOString() ?? null,
      updated_at: new Date(
        Math.max(...updated.map((date) => date.getTime())),
      ).toISOString(),
      callback_status:
        invalid + failed > 0
          ? 'not_applicable'
          : run.status === 'failed'
            ? 'failed'
            : run.status === 'completed' || callback?.status === 'completed'
              ? 'completed'
              : callback?.status === 'processing'
                ? 'processing'
                : 'pending',
      error:
        status === 'failed'
          ? (items.find((item) => ['invalid', 'failed'].includes(item.status))
              ?.last_error ??
            callback?.error ??
            null)
          : null,
    };
  }

  private async read<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível consultar os lotes',
      );
    }
  }
}
