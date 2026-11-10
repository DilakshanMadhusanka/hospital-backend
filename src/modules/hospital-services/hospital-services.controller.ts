import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

import { ServiceStatus } from '@prisma/client';

import { HospitalServicesService } from './hospital-services.service.js';

import { CreateHospitalServiceDto } from './dto/create-hospital-service.dto.js';
import { UpdateHospitalServiceDto } from './dto/update-hospital-service.dto.js';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

class HospitalServiceQueryDto {

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsUUID()
  hospitalId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;
}
    
@UseGuards(JwtAuthGuard)
@ApiTags('Hospital Services')
@Controller('hospital-services')
export class HospitalServicesController {

  constructor(
    private readonly service: HospitalServicesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create hospital service' })
  create(@Body() dto: CreateHospitalServiceDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get hospital services' })
  findAll(@Query() query: HospitalServiceQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHospitalServiceDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}