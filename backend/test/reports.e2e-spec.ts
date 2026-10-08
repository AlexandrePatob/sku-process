import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { ReportsController } from '../src/process/controllers/reports.controller.js';
import { ReportsService } from '../src/process/services/reports.service.js';

describe('GET reports (HTTP)', () => {
  it('encaminha identificador e filtros, retorna 200 e preserva 404', async () => {
    const getRun = vi
      .fn()
      .mockResolvedValue({ run_id: 'run-1', status: 'pending', report: null });
    const getReports = vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    });
    const module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: { getRun, getReports } },
      ],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    try {
      await request(app.getHttpServer())
        .get('/runs/run-1')
        .expect(200)
        .expect({ run_id: 'run-1', status: 'pending', report: null });
      expect(getRun).toHaveBeenCalledWith('run-1');
      await request(app.getHttpServer())
        .get('/reports?status=processing&page=2&limit=10&run_id=lote')
        .expect(200);
      expect(getReports).toHaveBeenCalledWith({
        status: 'processing',
        page: 2,
        limit: 10,
        run_id: 'lote',
      });
      await request(app.getHttpServer()).get('/reports').expect(200);
      expect(getReports).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
      for (const query of [
        'page=0',
        'page=1.5',
        'page=nope',
        'limit=101',
        'limit=1&limit=2',
        'status=unknown',
        'run_id=a&run_id=b',
      ]) {
        getReports.mockClear();
        await request(app.getHttpServer()).get(`/reports?${query}`).expect(400);
        expect(getReports).not.toHaveBeenCalled();
      }
      getRun.mockRejectedValueOnce(
        new NotFoundException('Lote não encontrado'),
      );
      const response = await request(app.getHttpServer())
        .get('/runs/missing')
        .expect(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Lote não encontrado',
      });
    } finally {
      await app.close();
    }
  });
});
