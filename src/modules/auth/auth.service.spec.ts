import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma.service.js';
import { AuthService } from './auth.service.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

describe('AuthService administrator login', () => {
  const findUnique = vi.fn();
  const findFirst = vi.fn();
  const signAsync = vi.fn();
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
    signAsync.mockResolvedValue('signed-token');
    authService = new AuthService(
      {
        user: { findUnique },
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

    expect(findFirst).not.toHaveBeenCalled();
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
});
