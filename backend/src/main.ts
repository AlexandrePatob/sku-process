import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common/pipes/index.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  if (existsSync(envPath)) loadEnvFile(envPath);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SKU Process API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
