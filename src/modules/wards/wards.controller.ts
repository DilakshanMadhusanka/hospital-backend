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

import { WardsService } from './wards.service.js';

import { CreateWardDto } from './dto/create-ward.dto.js';
import { UpdateWardDto } from './dto/update-ward.dto.js';

import { IsEnum, IsOptional, IsString, IsUUID, Max, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { WardType } from '@prisma/client';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';

class WardQueryDto {

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
  @IsEnum(WardType)
  type?: WardType;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Wards')
@Controller('wards')
export class WardsController {

  constructor(
    private readonly service: WardsService,
  ) {}

  @Permissions('wards.create')
  @Post()
  @ApiOperation({ summary: 'Create hospital ward' })
  create(@Body() dto: CreateWardDto) {
    return this.service.create(dto);
  }

  @Permissions('wards.read')
  @Get()
  findAll(@Query() query: WardQueryDto) {
    return this.service.findAll(query);
  }

  @Permissions('wards.read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Permissions('wards.update')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWardDto,
  ) {
    return this.service.update(id, dto);
  }

  @Permissions('wards.delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}