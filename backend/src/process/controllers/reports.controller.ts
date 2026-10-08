import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ReportsService } from '../services/reports.service.js';
import type { RunReport, ReportsResponse } from '../dto/report.dto.js';
import { ReportsQueryDto } from '../dto/reports-query.dto.js';

@Controller()
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly service: ReportsService,
  ) {}

  @Get('runs/:run_id')
  getRun(@Param('run_id') runId: string): Promise<RunReport> {
    return this.service.getRun(runId);
  }

  @Get('reports')
  getReports(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        expectedType: ReportsQueryDto,
      }),
    )
    query: ReportsQueryDto,
  ): Promise<ReportsResponse> {
    return this.service.getReports(query);
  }
}
