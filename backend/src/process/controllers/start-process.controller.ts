import { Controller, Inject, Post } from '@nestjs/common';
import { StartProcessService } from '../services/start-process.service.js';

@Controller('start-process')
export class StartProcessController {
  constructor(
    @Inject(StartProcessService) private readonly service: StartProcessService,
  ) {}

  @Post()
  async start() {
    return this.service.start();
  }
}
