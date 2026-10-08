import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { loggerOptions } from '../logging/logger-options.js';
import { ProcessModule } from './process.module.js';
import { EnrichConsumer } from './consumers/enrich.consumer.js';
import { CallbackModule } from '../callback/callback.module.js';
import { CallbackConsumer } from '../callback/callback.consumer.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => ({ pinoHttp: loggerOptions() }),
    }),
    ProcessModule,
    CallbackModule,
  ],
  providers: [EnrichConsumer, CallbackConsumer],
})
export class WorkerModule {}
