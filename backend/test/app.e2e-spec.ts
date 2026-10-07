import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';

describe('POST /check (e2e local)', () => {
  it('devolve o token e rejeita token inválido pela rota HTTP', async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    try {
      await request(app.getHttpServer())
        .post('/check')
        .send({ token: ' a3f9... ' })
        .expect(200)
        .expect({ token: ' a3f9... ' });
      await request(app.getHttpServer())
        .post('/check')
        .send({ token: '   ' })
        .expect(400);
    } finally {
      await app.close();
    }
  });
});
