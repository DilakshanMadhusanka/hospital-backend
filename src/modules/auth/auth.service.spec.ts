import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { validate } from 'class-validator';

import { PrismaService } from '../../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

describe('AuthService administrator login', () => {
  const findUnique = vi.fn();
  const findFirst = vi.fn();
  const createUser = vi.fn();
  const signAsync = vi.fn();
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockReset();
    findFirst.mockReset();
    createUser.mockReset();
    signAsync.mockReset();
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    signAsync.mockResolvedValue('signed-token');
    authService = new AuthService(
      {
        user: { findUnique, create: createUser },
        userRole: { findFirst },
      } as unknown as PrismaService,
      { signAsync } as never,
    );
  });

  it('only issues an administrator session to the unique assigned admin', async () => {
    findUnique.mockResolvedValue({
      id: 'admin-id',
      email: 'admin@example.test',
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
      passwordHash: 'stored-hash',
      systemAdminKey: 'SYSTEM_ADMIN',
    });
    findFirst.mockResolvedValue({ id: 'admin-assignment' });

    const result = await authService.adminLogin({
      email: 'admin@example.test',
      password: 'valid-password',
    });

    expect(result.user.isSystemAdmin).toBe(true);
    expect(result.accessToken).toBe('signed-token');
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'admin-id',
        hospitalId: null,
        role: { name: 'SYSTEM_ADMIN' },
      },
      select: { id: true },
    });
  });

  it('rejects a regular user from the administrator sign-in endpoint', async () => {
    findUnique.mockResolvedValue({
      id: 'staff-id',
      email: 'staff@example.test',
      firstName: 'Hospital',
      lastName: 'Staff',
      isActive: true,
      passwordHash: 'stored-hash',
      systemAdminKey: null,
    });

    await expect(
      authService.adminLogin({
        email: 'staff@example.test',
        password: 'valid-password',
      }),
    ).rejects.toThrow('Invalid email or password');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'staff-id',
        hospitalId: null,
        role: { name: 'SYSTEM_ADMIN' },
      },
      select: { id: true },
    });
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('allows the administrator to use standard login without changing their role', async () => {
    findUnique.mockResolvedValue({
      id: 'admin-id',
      email: 'admin@example.test',
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
      passwordHash: 'stored-hash',
      systemAdminKey: 'SYSTEM_ADMIN',
    });
    findFirst.mockResolvedValue({ id: 'admin-assignment' });

    const result = await authService.login({
      email: 'admin@example.test',
      password: 'valid-password',
    });

    expect(result.user.isSystemAdmin).toBe(true);
  });

  it('registers a user without an optional phone number', async () => {
    findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      id: 'new-user-id',
      email: 'new@example.test',
      firstName: 'New',
      lastName: 'User',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await authService.register({
      email: 'New@example.test',
      firstName: 'New',
      lastName: 'User',
      password: 'a-valid-test-password',
    });

    expect(result.user.email).toBe('new@example.test');
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'new@example.test' },
      select: { id: true },
    });
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.test',
          username: 'new@example.test',
          phone: undefined,
        }),
      }),
    );
  });

  it('accepts a registration without the optional phone field', async () => {
    const errors = await validate(
      Object.assign(new RegisterDto(), {
        email: 'new@example.test',
        firstName: 'New',
        lastName: 'User',
        password: 'a-valid-test-password',
      }),
    );

    expect(errors).toEqual([]);
  });

  it('reports a concurrent duplicate registration as a conflict', async () => {
    findUnique.mockResolvedValue(null);
    createUser.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'test' },
      ),
    );

    await expect(
      authService.register({
        email: 'existing@example.test',
        firstName: 'Existing',
        lastName: 'User',
        password: 'a-valid-test-password',
      }),
    ).rejects.toThrow('Email already registered');
  });
});
