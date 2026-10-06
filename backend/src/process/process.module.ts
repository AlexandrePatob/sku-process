import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import dataSource from '../database/data-source.js';
import { ProcessController } from './controllers/process.controller.js';
import { ProcessService } from './services/process.service.js';

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
          maxRetriesPerRequest: 1,
          commandTimeout: 400,
          connectTimeout: 1000,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'processing' }),
  ],
  controllers: [ProcessController],
  providers: [ProcessService],
})
export class ProcessModule {}
