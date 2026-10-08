import { BadRequestException, Controller, Headers, Inject, Post } from '@nestjs/common';
import { StartProcessService } from '../services/start-process.service.js';

@Controller('start-process')
export class StartProcessController {
  constructor(
    @Inject(StartProcessService) private readonly service: StartProcessService,
  ) {}

  @Post()
  async start(
    @Headers('x-cid') cid?: string,
    @Headers('x-token') token?: string,
  ) {
    if (!cid || !token) {
      throw new BadRequestException('Informe x-cid e x-token');
    }
    return this.service.start(cid, token);
  }
}
