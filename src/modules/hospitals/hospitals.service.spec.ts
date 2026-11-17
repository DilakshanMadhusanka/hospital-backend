import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../database/prisma.service.js';
import { HospitalsService } from './hospitals.service.js';

describe('HospitalsService access scope', () => {
  const findFirstAssignment = vi.fn();
  const findAssignments = vi.fn();
  const findHospitals = vi.fn();
  const countHospitals = vi.fn();
  const findHospital = vi.fn();
  let hospitalsService: HospitalsService;

  beforeEach(() => {
    vi.clearAllMocks();
    findFirstAssignment.mockResolvedValue(null);
    findAssignments.mockResolvedValue([{ hospitalId: 'hospital-1' }]);
    findHospitals.mockResolvedValue([]);
    countHospitals.mockResolvedValue(0);
    findHospital.mockResolvedValue(null);

    hospitalsService = new HospitalsService({
      userRole: {
        findFirst: findFirstAssignment,
        findMany: findAssignments,
      },
      hospital: {
        findMany: findHospitals,
        count: countHospitals,
        findUnique: findHospital,
      },
      $transaction: vi.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    } as unknown as PrismaService);
  });

  it('limits hospital listings to the authenticated user assignments', async () => {
    await hospitalsService.findAll({}, 'user-1');

    expect(findHospitals).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['hospital-1'] } },
      }),
    );
    expect(countHospitals).toHaveBeenCalledWith({
      where: { id: { in: ['hospital-1'] } },
    });
  });

  it('does not disclose details of an unassigned hospital', async () => {
    await expect(
      hospitalsService.findOne('hospital-2', 'user-1'),
    ).rejects.toThrow('Hospital not found');

    expect(findHospital).not.toHaveBeenCalled();
  });

  it('keeps system administrators unrestricted', async () => {
    findFirstAssignment.mockResolvedValue({ id: 'system-admin-assignment' });

    await hospitalsService.findAll({}, 'system-admin');

    expect(findHospitals).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
    expect(findAssignments).not.toHaveBeenCalled();
  });
});
