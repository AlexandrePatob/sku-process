import {
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Run } from '../entities/run.entity.js';
import { RunItem } from '../entities/run-item.entity.js';
import type { ProcessMessageDto } from '../dto/process-message.dto.js';

@Injectable()
export class ProcessService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @InjectQueue('processing') private readonly queue: Queue,
    @InjectPinoLogger(ProcessService.name) private readonly logger: PinoLogger,
  ) {}

  async receive(message: ProcessMessageDto): Promise<void> {
    let item: RunItem;
    try {
      // Salva lote e item juntos antes de tentar publicar na fila.
      item = await this.database.transaction(async (manager) => {
        await manager
          .createQueryBuilder()
          .insert()
          .into(Run)
          .values({ run_id: message.run_id })
          .orIgnore()
          .execute();
        await manager
          .createQueryBuilder()
          .insert()
          .into(RunItem)
          .values({ ...message })
          .orIgnore()
          .execute();
        const stored = await manager.findOneByOrFail(RunItem, {
          run_id: message.run_id,
          seq: message.seq,
        });
        if (stored.sku !== message.sku) {
          throw new ConflictException(
            'run_id e seq já recebidos com outro SKU',
          );
        }
        return stored;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(message, 'Mensagem recebida com SKU conflitante');
        throw error;
      }
      const messageError = 'Não foi possível persistir a mensagem';
      this.logger.error({ err: error, ...message }, messageError);
      throw new ServiceUnavailableException(messageError);
    }

    this.logger.info(
      { ...message, item_id: item.id },
      'Mensagem persistida',
    );
    if (item.status === 'completed') {
      this.logger.info(
        { ...message, item_id: item.id },
        'Item já processado recebido novamente',
      );
      return;
    }

    try {
      await this.queue.add(
        'enrich-sku',
        { ...message, item_id: item.id },
        {
          jobId: item.id,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000, jitter: 0.5 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (error) {
      const messageError = 'Não foi possível publicar a mensagem na fila';
      this.logger.error({ err: error, ...message, item_id: item.id }, messageError);
      throw new ServiceUnavailableException(messageError);
    }
    this.logger.info(
      { ...message, item_id: item.id, job_id: item.id },
      'Job confirmado na fila [enrich-sku] para processamento',
    );
  }
}
