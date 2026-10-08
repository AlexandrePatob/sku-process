import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { ReportsService } from './reports.service.js';
import { Run } from '../entities/run.entity.js';
import { RunItem } from '../entities/run-item.entity.js';
import { ReportsQueryDto } from '../dto/reports-query.dto.js';

describe('ReportsService', () => {
  function setup() {
    const runs = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    const items = { find: vi.fn().mockResolvedValue([]) };
    const callbacks = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };
    const service = new ReportsService({
      getRepository: (entity: typeof Run | typeof RunItem) =>
        entity === Run ? runs : entity === RunItem ? items : callbacks,
    } as unknown as DataSource);
    return { service, runs };
  }

  it('retorna 404 para lote ausente', async () => {
    await expect(setup().service.getRun('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('retorna paginação vazia sem consultar itens', async () => {
    expect(await setup().service.getReports(new ReportsQueryDto())).toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    });
  });

  it('responde 503 quando banco está indisponível', async () => {
    const { service, runs } = setup();
    runs.find.mockRejectedValue(new Error('connection refused'));
    runs.findOneBy.mockRejectedValue(new Error('connection refused'));
    await expect(service.getRun('one')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(
      service.getReports(new ReportsQueryDto()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
