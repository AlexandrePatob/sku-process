import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProcessModule } from './process/process.module.js';
import { loggerOptions } from './logging/logger-options.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({ useFactory: () => ({ pinoHttp: loggerOptions() }) }),
    ProcessModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
