import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Run } from '../../process/entities/run.entity.js';

@Entity('callback_attempts')
export class CallbackAttempt {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'text' })
  run_id!: string;

  @ManyToOne(() => Run, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'run_id', foreignKeyConstraintName: 'callback_attempts_run_id_fk' })
  run!: Run;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'integer', nullable: true })
  http_status!: number | null;

  @Column({ type: 'text', nullable: true })
  response_body!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  started_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finished_at!: Date | null;
}
