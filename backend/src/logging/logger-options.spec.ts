import { Writable } from 'node:stream';
import express from 'express';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { loggerOptions } from './logger-options.js';

describe('HTTP logging', () => {
  it('records request lifecycle and omits credentials', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const app = express();
    app.use(express.json());
    app.use(pinoHttp({ ...loggerOptions(), transport: undefined }, stream));
    app.post('/check', (_req, res) => res.status(200).json({ ok: true }));
    const response = await request(app)
      .post('/check?token=query-secret')
      .set('x-token', 'header-secret')
      .set('Authorization', 'Bearer bearer-secret')
      .send({ token: 'body-secret', password: 'password-secret' })
      .expect(200);
    expect(response.headers['x-request-id']).toBeTruthy();
    const logs = lines.map((line) => JSON.parse(line));
    expect(logs.map((log) => log.msg)).toEqual([
      'HTTP request received',
      'HTTP request completed',
    ]);
    expect(logs[0].req.method).toBe('POST');
    expect(logs[0].req.path).toBe('/check');
    expect(logs[1].req.id).toBe(response.headers['x-request-id']);
    expect(logs[1].res.statusCode).toBe(200);
    expect(typeof logs[1].responseTime).toBe('number');
    expect(lines.join('')).not.toContain('secret');
  });
});
