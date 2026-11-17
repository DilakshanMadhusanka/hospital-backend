import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service.js';

import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    let user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      createdAt: Date;
    };
    try {
      user = await this.prisma.user.create({
        data: {
          username: email,
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          phone: dto.phone,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }

    return {
      message: 'User registered successfully',
      user,
    };
  }

  async login(dto: LoginDto) {
    return this.authenticate(dto, false);
  }

  async adminLogin(dto: LoginDto) {
    return this.authenticate(dto, true);
  }

  private async authenticate(dto: LoginDto, requireSystemAdmin: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const adminAssignment = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        hospitalId: null,
        role: { name: 'SYSTEM_ADMIN' },
      },
      select: { id: true },
    });
    const isSystemAdmin = Boolean(adminAssignment);
    if (requireSystemAdmin && !isSystemAdmin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const roleAssignments = await this.prisma.userRole.findMany({
      where: { userId: user.id, hospitalId: { not: null } },
      select: {
        hospitalId: true,
        role: { select: { name: true } },
      },
    });
    const hospitalIds = [
      ...new Set(
        roleAssignments
          .map((assignment) => assignment.hospitalId)
          .filter((hospitalId): hospitalId is string => hospitalId !== null),
      ),
    ];
    const roles = [
      ...new Set(roleAssignments.map((assignment) => assignment.role.name)),
    ];

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login successful',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSystemAdmin,
        hospitalIds,
        roles,
      },
    };
  }
}