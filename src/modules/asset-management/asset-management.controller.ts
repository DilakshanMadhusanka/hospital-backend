import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AssetManagementService } from './asset-management.service.js';

import { CreateAssetCategoryDto } from './dto/create-asset-category.dto.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { UpdateAssetDto } from './dto/update-asset.dto.js';
import { MoveAssetDto } from './dto/move-asset.dto.js';
import { QueryAssetsDto } from './dto/query-assets.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';

import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('asset-management')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetManagementController {
  constructor(
    private readonly assetService: AssetManagementService,
  ) {}

  @Post('categories')
  @Permissions('assets.manage')
  createCategory(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAssetCategoryDto,
  ) {
    return this.assetService.createCategory(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get('categories')
  @Permissions('assets.read')
  getCategories(
    @Query('hospitalId') hospitalId: string,
  ) {
    return this.assetService.getCategories(hospitalId);
  }

  @Post()
  @Permissions('assets.manage')
  createAsset(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetService.createAsset(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get()
  @Permissions('assets.read')
  getAssets(
    @Query('hospitalId') hospitalId: string,
    @Query() query: QueryAssetsDto,
  ) {
    return this.assetService.getAssets(
      hospitalId,
      query,
    );
  }

  @Get('summary')
  @Permissions('assets.read')
  getAssetSummary(
    @Query('hospitalId') hospitalId: string,
  ) {
    return this.assetService.getAssetSummary(hospitalId);
  }

  @Get(':assetId/movements')
  @Permissions('assets.read')
  getAssetMovements(
    @Query('hospitalId') hospitalId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.getAssetMovements(
      hospitalId,
      assetId,
    );
  }

  @Get(':assetId')
  @Permissions('assets.read')
  getAsset(
    @Query('hospitalId') hospitalId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetService.getAsset(
      hospitalId,
      assetId,
    );
  }

  @Patch(':assetId')
  @Permissions('assets.manage')
  updateAsset(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('assetId') assetId: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.updateAsset(
      hospitalId,
      user.id,
      assetId,
      dto,
    );
  }

  @Post(':assetId/move')
  @Permissions('assets.manage')
  moveAsset(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('assetId') assetId: string,
    @Body() dto: MoveAssetDto,
  ) {
    return this.assetService.moveAsset(
      hospitalId,
      user.id,
      assetId,
      dto,
    );
  }

  @Post(':assetId/mark-lost')
  @Permissions('assets.manage')
  markLost(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('assetId') assetId: string,
    @Body('reason') reason: string,
  ) {
    return this.assetService.markLost(
      hospitalId,
      user.id,
      assetId,
      reason,
    );
  }

  @Post(':assetId/dispose')
  @Permissions('assets.manage')
  disposeAsset(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('assetId') assetId: string,
    @Body('reason') reason: string,
  ) {
    return this.assetService.disposeAsset(
      hospitalId,
      user.id,
      assetId,
      reason,
    );
  }
}