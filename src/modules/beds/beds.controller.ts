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

import { BedStatus } from '@prisma/client';

import { BedsService } from './beds.service.js';

import { CreateBedDto } from './dto/create-bed.dto.js';
import { UpdateBedDto } from './dto/update-bed.dto.js';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

class BedQueryDto {

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
  wardId?: string;

  @IsOptional()
  @IsEnum(BedStatus)
  status?: BedStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
    
@UseGuards(JwtAuthGuard)
@ApiTags('Beds')
@Controller('beds')
export class BedsController {

  constructor(
    private readonly service: BedsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a new bed' })
  create(@Body() dto: CreateBedDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get beds with filters' })
  findAll(@Query() query: BedQueryDto) {
    return this.service.findAll(query);
  }

  @Get('availability/:hospitalId')
  @ApiOperation({ summary: 'Get hospital bed availability' })
  getAvailability(
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.service.getAvailability(hospitalId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBedDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}