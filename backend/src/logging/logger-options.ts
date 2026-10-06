import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { Options } from 'pino-http';

export function loggerOptions(): Options {
  const development =
    process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';
  return {
    level: process.env.LOG_LEVEL ?? (development ? 'debug' : 'info'),
    transport: development
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            singleLine: false,
          },
        }
      : undefined,
    genReqId: (_req, res) => {
      const id = randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customReceivedMessage: () => 'HTTP request received',
    customSuccessMessage: () => 'HTTP request completed',
    customErrorMessage: () => 'HTTP request failed',
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    wrapSerializers: false,
    serializers: {
      req: (req: Request & { id?: string }) => ({
        id: req.id,
        method: req.method,
        path: req.url.split('?')[0],
        ...(development && req.body && typeof req.body === 'object'
          ? {
              body: {
                run_id:
                  typeof req.body.run_id === 'string'
                    ? req.body.run_id
                    : undefined,
                seq:
                  typeof req.body.seq === 'number' ? req.body.seq : undefined,
                sku:
                  typeof req.body.sku === 'string' ? req.body.sku : undefined,
              },
            }
          : {}),
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  };
}
