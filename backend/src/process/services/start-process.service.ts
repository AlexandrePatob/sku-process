import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Run } from '../entities/run.entity.js';
import { CallbackService } from '../../callback/callback.service.js';

type BurstResponse = { run_id: string; total: number };

@Injectable()
export class StartProcessService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(CallbackService) private readonly callbackService: CallbackService,
  ) {}

  async start(): Promise<BurstResponse> {
    const baseUrl = process.env.PLATFORM_BASE_URL;
    const cid = process.env.PLATFORM_CID;
    const token = process.env.PLATFORM_TOKEN;
    if (!baseUrl || !cid || !token) {
      throw new ServiceUnavailableException(
        'Configure PLATFORM_BASE_URL, PLATFORM_CID e PLATFORM_TOKEN',
      );
    }

    const url = new URL(
      `burst/${encodeURIComponent(cid)}`,
      baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
    );
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-token': token },
    });
    if (!response.ok) {
      throw new BadGatewayException(`Burst respondeu HTTP ${response.status}`);
    }

    const result = (await response.json()) as BurstResponse;
    if (!result.run_id || !Number.isInteger(result.total) || result.total < 1) {
      throw new BadGatewayException('Resposta do burst inválida');
    }

    await this.database
      .getRepository(Run)
      .upsert({ run_id: result.run_id, expected_total: result.total }, [
        'run_id',
      ]);
    await this.callbackService.enqueueIfReady(result.run_id);
    return result;
  }
}
