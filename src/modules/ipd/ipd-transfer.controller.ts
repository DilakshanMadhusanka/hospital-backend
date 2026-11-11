
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

import { IpdTransferService } from './ipd-transfer.service.js';

import { CreateIPDTransferDto } from './dto/create-ipd-transfer.dto.js';
import { RejectIPDTransferDto } from './dto/reject-ipd-transfer.dto.js';
import { QueryIPDTransfersDto } from './dto/query-ipd-transfers.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';

@Controller('ipd/transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IpdTransferController {
  constructor(
    private readonly transferService: IpdTransferService,
  ) {}

  @Post()
  @Permissions('ipd.transfers.create')
  createTransferRequest(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateIPDTransferDto,
  ) {
    return this.transferService.createTransferRequest(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get()
  @Permissions('ipd.transfers.read')
  getTransfers(
    @Query('hospitalId') hospitalId: string,
    @Query() query: QueryIPDTransfersDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.transferService.getTransfers(
      hospitalId,
      user.id,
      query,
    );
  }

  @Get(':transferId')
  @Permissions('ipd.transfers.read')
  getTransferById(
    @Param('transferId') transferId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transferService.getTransferById(
      transferId,
      hospitalId,
      user.id,
    );
  }

  @Patch(':transferId/approve')
  @Permissions('ipd.transfers.approve')
  approveTransfer(
    @Param('transferId') transferId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transferService.approveTransfer(
      transferId,
      hospitalId,
      user.id,
    );
  }

  @Patch(':transferId/reject')
  @Permissions('ipd.transfers.reject')
  rejectTransfer(
    @Param('transferId') transferId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: RejectIPDTransferDto,
  ) {
    return this.transferService.rejectTransfer(
      transferId,
      hospitalId,
      user.id,
      dto,
    );
  }

  @Patch(':transferId/complete')
  @Permissions('ipd.transfers.complete')
  completeTransfer(
    @Param('transferId') transferId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transferService.completeTransfer(
      transferId,
      hospitalId,
      user.id,
    );
  }

  @Patch(':transferId/cancel')
  @Permissions('ipd.transfers.cancel')
  cancelTransfer(
    @Param('transferId') transferId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transferService.cancelTransfer(
      transferId,
      hospitalId,
      user.id,
    );
  }
}
