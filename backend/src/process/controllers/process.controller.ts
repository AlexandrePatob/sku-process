import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ProcessService } from '../services/process.service.js';
import type { ProcessMessageDto } from '../dto/process-message.dto.js';

@Controller('process')
export class ProcessController {
  constructor(
    @Inject(ProcessService) private readonly service: ProcessService,
  ) {}

  @Post()
  @HttpCode(202)
  async receive(@Body() message: ProcessMessageDto) {
    await this.service.receive(message);
    return { ok: true };
  }
}
