import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CallbackService } from './callback.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'callback' })],
  providers: [CallbackService],
  exports: [CallbackService],
})
export class CallbackModule {}
