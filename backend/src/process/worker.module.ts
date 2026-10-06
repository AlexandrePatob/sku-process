import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { loggerOptions } from '../logging/logger-options.js';
import { ProcessModule } from './process.module.js';
import { EnrichConsumer } from './consumers/enrich.consumer.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => ({ pinoHttp: loggerOptions() }),
    }),
    ProcessModule,
  ],
  providers: [EnrichConsumer],
})
export class WorkerModule {}
