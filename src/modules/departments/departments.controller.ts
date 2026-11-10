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

import { DepartmentsService } from './departments.service.js';

import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { DepartmentQueryDto } from './dto/department-query.dto.js';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {

  constructor(
    private readonly service: DepartmentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create department' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get departments with filters' })
  findAll(@Query() query: DepartmentQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}