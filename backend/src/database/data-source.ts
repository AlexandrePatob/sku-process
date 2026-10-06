import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { Run } from '../process/entities/run.entity.js';
import { RunItem } from '../process/entities/run-item.entity.js';
import { CreateRuns1791244800000 } from './migrations/1791244800000-CreateRuns.js';
import { CreateRunItems1791244800001 } from './migrations/1791244800001-CreateRunItems.js';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  entities: [Run, RunItem],
  migrations: [CreateRuns1791244800000, CreateRunItems1791244800001],
});
