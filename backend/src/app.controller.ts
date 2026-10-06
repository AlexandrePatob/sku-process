import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('check')
  @HttpCode(200)
  check(@Body() body: unknown): { token: string } {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('token' in body) ||
      typeof body.token !== 'string' ||
      body.token.trim().length === 0
    ) {
      throw new BadRequestException('Token deve ser uma string valida!');
    }
    return { token: body.token };
  }
}
