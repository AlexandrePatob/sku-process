import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BadRequestException } from '@nestjs/common';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('/check', () => {
    it('devolve o token sem alterá-lo', () => {
      expect(appController.check({ token: ' a3f9... ' })).toEqual({ token: ' a3f9... ' });
    });

    it.each([{}, { token: '' }, { token: '   ' }, { token: 123 }, null])(
      'rejeita token inválido:',
      (body) => {
        expect(() => appController.check(body)).toThrow(BadRequestException);
      },
    );
  });
});
