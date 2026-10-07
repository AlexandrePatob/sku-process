import { Table } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCallbackAttempts1791244800002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'callback_attempts',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
        { name: 'run_id', type: 'text' },
        { name: 'status', type: 'varchar', length: '32' },
        { name: 'http_status', type: 'integer', isNullable: true },
        { name: 'response_body', type: 'text', isNullable: true },
        { name: 'error', type: 'text', isNullable: true },
        { name: 'started_at', type: 'timestamptz', default: 'now()' },
        { name: 'finished_at', type: 'timestamptz', isNullable: true },
      ],
      foreignKeys: [{
        name: 'callback_attempts_run_id_fk',
        columnNames: ['run_id'],
        referencedTableName: 'runs',
        referencedColumnNames: ['run_id'],
        onDelete: 'NO ACTION',
      }],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('callback_attempts');
  }
}
