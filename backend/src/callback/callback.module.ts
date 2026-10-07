import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CallbackService } from './callback.service.js';
import { CallbackConsumer } from './callback.consumer.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'callback' })],
  providers: [CallbackService, CallbackConsumer],
  exports: [CallbackService],
})
export class CallbackModule {}
