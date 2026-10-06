import { Table } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRunItems1791244800001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'run_items',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
        { name: 'run_id', type: 'text' },
        { name: 'seq', type: 'integer' },
        { name: 'sku', type: 'text' },
        { name: 'status', type: 'varchar', length: '32', default: "'pending'" },
        { name: 'price', type: 'numeric', precision: 18, scale: 2, isNullable: true },
        { name: 'stock', type: 'integer', isNullable: true },
        { name: 'attempts', type: 'integer', default: 0 },
        { name: 'last_error', type: 'text', isNullable: true },
        { name: 'created_at', type: 'timestamptz', default: 'now()' },
        { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        { name: 'started_at', type: 'timestamptz', isNullable: true },
        { name: 'finished_at', type: 'timestamptz', isNullable: true },
      ],
      foreignKeys: [{
        name: 'run_items_run_id_fk',
        columnNames: ['run_id'],
        referencedTableName: 'runs',
        referencedColumnNames: ['run_id'],
        onDelete: 'NO ACTION',
      }],
      uniques: [{ name: 'run_items_run_seq_unique', columnNames: ['run_id', 'seq'] }],
      checks: [
        { name: 'run_items_seq_check', expression: 'seq >= 0' },
        { name: 'run_items_attempts_check', expression: 'attempts >= 0' },
        { name: 'run_items_price_check', expression: 'price >= 0' },
        { name: 'run_items_stock_check', expression: 'stock >= 0' },
      ],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('run_items');
  }
}
