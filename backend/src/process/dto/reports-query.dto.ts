import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { RunStatus } from './report.dto.js';

export class ReportsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(['pending', 'processing', 'completed', 'failed'])
  status?: RunStatus;

  @IsOptional()
  @IsString()
  run_id?: string;
}
