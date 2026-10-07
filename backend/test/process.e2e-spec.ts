import { ConflictException, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ProcessController } from '../src/process/controllers/process.controller.js';
import { ProcessService } from '../src/process/services/process.service.js';

describe('POST /process (e2e local)', () => {
  it('confirma mensagens válidas e rejeita entradas ou falhas sem ACK', async () => {
    const receive = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      controllers: [ProcessController],
      providers: [{ provide: ProcessService, useValue: { receive } }],
    }).compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const message = { run_id: 'run-1', seq: 7, sku: 'sku-001' };
    try {
      await request(app.getHttpServer()).post('/process').send(message)
        .expect(202).expect({ ok: true });
      expect(receive).toHaveBeenCalledWith(message);

      receive.mockClear();
      await request(app.getHttpServer()).post('/process')
        .send({ ...message, seq: -1 }).expect(400);
      expect(receive).not.toHaveBeenCalled();

      receive.mockRejectedValueOnce(new ConflictException());
      await request(app.getHttpServer()).post('/process').send(message).expect(409);

      receive.mockRejectedValueOnce(new ServiceUnavailableException());
      await request(app.getHttpServer()).post('/process').send(message).expect(503);
    } finally {
      await app.close();
    }
  });
});
