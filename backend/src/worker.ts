import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './process/worker.module.js';

if (
  !process.env.PLATFORM_BASE_URL ||
  !process.env.PLATFORM_CID ||
  !process.env.PLATFORM_TOKEN
) {
  throw new Error(
    'Configure PLATFORM_BASE_URL, PLATFORM_CID e PLATFORM_TOKEN antes de iniciar o worker',
  );
}

const app = await NestFactory.createApplicationContext(WorkerModule, {
  bufferLogs: true,
});
app.useLogger(app.get(Logger));
