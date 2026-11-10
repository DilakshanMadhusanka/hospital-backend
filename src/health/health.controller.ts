
import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PrismaService } from '../database/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Check API and database health',
  })
  async checkHealth() {

    try {

      await this.prisma.$queryRaw`SELECT 1`;

      return {
        success: true,
        service: 'hospital-backend',
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {

      throw new ServiceUnavailableException({
        success: false,
        service: 'hospital-backend',
        status: 'unhealthy',
        database: 'disconnected',
      });

    }
  }
}
