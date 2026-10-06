import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { Run } from './run.entity.js';

@Entity('run_items')
@Unique('run_items_run_seq_unique', ['run_id', 'seq'])
@Check('run_items_seq_check', 'seq >= 0')
@Check('run_items_attempts_check', 'attempts >= 0')
@Check('run_items_price_check', 'price >= 0')
@Check('run_items_stock_check', 'stock >= 0')
export class RunItem {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'text' })
  run_id!: string;

  @ManyToOne(() => Run, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'run_id', foreignKeyConstraintName: 'run_items_run_id_fk' })
  run!: Run;

  @Column({ type: 'integer' })
  seq!: number;

  @Column({ type: 'text' })
  sku!: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  price!: string | null;

  @Column({ type: 'integer', nullable: true })
  stock!: number | null;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ type: 'text', nullable: true })
  last_error!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finished_at!: Date | null;
}
