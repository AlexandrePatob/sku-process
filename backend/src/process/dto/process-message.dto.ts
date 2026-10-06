import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class ProcessMessageDto {
  @IsString()
  @Matches(/\S/)
  run_id!: string;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  seq!: number;

  @IsString()
  @Matches(/\S/)
  sku!: string;
}
