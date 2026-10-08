import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import dataSource from '../database/data-source.js';
import { ProcessController } from './controllers/process.controller.js';
import { ProcessService } from './services/process.service.js';
import { StartProcessController } from './controllers/start-process.controller.js';
import { StartProcessService } from './services/start-process.service.js';
import { CallbackModule } from '../callback/callback.module.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...dataSource.options, synchronize: false }),
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? 6379),
          db: Number(process.env.REDIS_DB ?? 0),
          enableOfflineQueue: false,
          maxRetriesPerRequest: null,
          connectTimeout: 1000,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'processing' }),
    CallbackModule,
  ],
  controllers: [ProcessController, StartProcessController],
  providers: [ProcessService, StartProcessService],
  exports: [BullModule],
})
export class ProcessModule {}
