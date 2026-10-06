import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('runs')
export class Run {
  @PrimaryColumn({ type: 'text' })
  run_id!: string;

  @Column({ type: 'integer', nullable: true })
  expected_total!: number | null;

  @Column({ type: 'integer', default: 0 })
  completed_count!: number;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finished_at!: Date | null;
}
