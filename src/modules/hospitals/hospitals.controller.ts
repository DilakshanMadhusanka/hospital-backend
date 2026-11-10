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

import {
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';

import { HospitalsService } from './hospitals.service.js';

import { CreateHospitalDto } from './dto/create-hospital.dto.js';
import { UpdateHospitalDto } from './dto/update-hospital.dto.js';
import { HospitalQueryDto } from './dto/hospital-query.dto.js';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@ApiTags('Hospitals')
@Controller('hospitals')
export class HospitalsController {

  constructor(
    private readonly hospitalsService: HospitalsService,
  ) {}
  
  @Post()
  @ApiOperation({ summary: 'Register a new hospital' })
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all hospitals' })
  findAll(@Query() query: HospitalQueryDto) {
    return this.hospitalsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hospital by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hospital details' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.hospitalsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a hospital' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.hospitalsService.remove(id);
  }
}