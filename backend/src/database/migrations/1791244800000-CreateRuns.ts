import { Table } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRuns1791244800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'runs',
      columns: [
        { name: 'run_id', type: 'text', isPrimary: true },
        { name: 'expected_total', type: 'integer', isNullable: true },
        { name: 'completed_count', type: 'integer', default: 0 },
        { name: 'status', type: 'varchar', length: '32', default: "'pending'" },
        { name: 'created_at', type: 'timestamptz', default: 'now()' },
        { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        { name: 'started_at', type: 'timestamptz', isNullable: true },
        { name: 'finished_at', type: 'timestamptz', isNullable: true },
      ],
      checks: [
        { name: 'runs_expected_total_check', expression: 'expected_total >= 0' },
        { name: 'runs_completed_count_check', expression: 'completed_count >= 0 AND (expected_total IS NULL OR completed_count <= expected_total)' },
      ],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('runs');
  }
}
