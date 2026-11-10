
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {

  @Get()
  @ApiOperation({
    summary: 'Check hospital backend status',
  })
  checkHealth() {
    return {
      success: true,
      message: 'Government Hospital Management API is running',
      service: 'hospital-backend',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
