
import {
  PrismaClient,
  HospitalType,
  WardType,
  BedStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  console.log('Starting hospital database seeding...');

  // ==========================================
  // 1. CREATE DEMO HOSPITAL
  // ==========================================

  const hospital = await prisma.hospital.upsert({
    where: {
      code: 'DEMO-GH-001',
    },
    update: {},
    create: {
      code: 'DEMO-GH-001',
      name: 'Demo District General Hospital',
      type: HospitalType.DISTRICT_GENERAL,
      address: 'Demo Hospital Address',
      district: 'Gampaha',
      province: 'Western',
      phone: '0110000000',
      email: 'hospital@example.com',
    },
  });

  console.log('Hospital created:', hospital.name);

  // ==========================================
  // 2. CREATE DEPARTMENTS
  // ==========================================

  const departmentData = [
    { code: 'OPD', name: 'Outpatient Department' },
    { code: 'MED', name: 'Medical Department' },
    { code: 'SUR', name: 'Surgical Department' },
    { code: 'LAB', name: 'Laboratory Department' },
    { code: 'PHARM', name: 'Pharmacy Department' },
    { code: 'RAD', name: 'Radiology Department' },
    { code: 'EMG', name: 'Emergency Department' },
  ];

  for (const department of departmentData) {
    await prisma.department.upsert({
      where: {
        hospitalId_code: {
          hospitalId: hospital.id,
          code: department.code,
        },
      },
      update: {},
      create: {
        ...department,
        hospitalId: hospital.id,
      },
    });
  }

  console.log('Departments created');

  // ==========================================
  // 3. CREATE MEDICAL WARD
  // ==========================================

  const medicalDepartment =
    await prisma.department.findUniqueOrThrow({
      where: {
        hospitalId_code: {
          hospitalId: hospital.id,
          code: 'MED',
        },
      },
    });

  const ward = await prisma.ward.upsert({
    where: {
      hospitalId_code: {
        hospitalId: hospital.id,
        code: 'MED-WARD-01',
      },
    },
    update: {},
    create: {
      hospitalId: hospital.id,
      departmentId: medicalDepartment.id,
      code: 'MED-WARD-01',
      name: 'Medical Ward 01',
      type: WardType.MEDICAL,
      description: 'Demo medical inpatient ward',
    },
  });

  console.log('Medical ward created');

  // ==========================================
  // 4. CREATE BEDS
  // ==========================================

  for (let i = 1; i <= 20; i++) {

    const bedNumber = `BED-${String(i).padStart(3, '0')}`;

    await prisma.bed.upsert({
      where: {
        wardId_bedNumber: {
          wardId: ward.id,
          bedNumber,
        },
      },
      update: {},
      create: {
        hospitalId: hospital.id,
        wardId: ward.id,
        bedNumber,
        status: BedStatus.AVAILABLE,
      },
    });
  }

  console.log('20 beds created');

  // ==========================================
  // 5. CREATE HOSPITAL SERVICES
  // ==========================================

  const serviceData = [
    {
      code: 'OPD-SERVICE',
      name: 'Outpatient Consultation',
      departmentCode: 'OPD',
    },
    {
      code: 'LAB-SERVICE',
      name: 'Laboratory Investigations',
      departmentCode: 'LAB',
    },
    {
      code: 'PHARM-SERVICE',
      name: 'Medicine Dispensing',
      departmentCode: 'PHARM',
    },
    {
      code: 'RAD-SERVICE',
      name: 'Radiology Investigations',
      departmentCode: 'RAD',
    },
  ];

  for (const service of serviceData) {

    const department = await prisma.department.findUniqueOrThrow({
      where: {
        hospitalId_code: {
          hospitalId: hospital.id,
          code: service.departmentCode,
        },
      },
    });

    await prisma.hospitalService.upsert({
      where: {
        hospitalId_code: {
          hospitalId: hospital.id,
          code: service.code,
        },
      },
      update: {},
      create: {
        hospitalId: hospital.id,
        departmentId: department.id,
        code: service.code,
        name: service.name,
      },
    });
  }

  console.log('Hospital services created');

  // ==========================================
  // 6. CREATE SYSTEM ROLES
  // ==========================================

  const roles = [
    'SUPER_ADMIN',
    'HOSPITAL_ADMIN',
    'DOCTOR',
    'NURSE',
    'RECEPTIONIST',
    'PHARMACIST',
    'LAB_TECHNICIAN',
  ];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: {
        name: roleName,
      },
      update: {},
      create: {
        name: roleName,
        description: `${roleName} system role`,
        isSystem: true,
      },
    });
  }

  console.log('System roles created');

  // ==========================================
  // 7. CREATE INITIAL PERMISSIONS
  // ==========================================

  const permissions = [
    { code: 'PATIENT_CREATE', name: 'Create patients' },
    { code: 'PATIENT_READ', name: 'View patients' },
    { code: 'PATIENT_UPDATE', name: 'Update patients' },
    { code: 'PATIENT_DELETE', name: 'Delete patient records' },

    { code: 'USER_CREATE', name: 'Create users' },
    { code: 'USER_READ', name: 'View users' },
    { code: 'USER_UPDATE', name: 'Update users' },

    { code: 'HOSPITAL_MANAGE', name: 'Manage hospitals' },
    { code: 'DEPARTMENT_MANAGE', name: 'Manage departments' },

    { code: 'AUDIT_READ', name: 'View audit logs' },
  ];

  const permissionRecords = [];

  for (const permission of permissions) {

    const record = await prisma.permission.upsert({
      where: {
        code: permission.code,
      },
      update: {},
      create: permission,
    });

    permissionRecords.push(record);
  }

  console.log('Permissions created');

  // ==========================================
  // 8. ASSIGN ALL INITIAL PERMISSIONS
  // TO SUPER ADMIN
  // ==========================================

  const superAdmin = await prisma.role.findUniqueOrThrow({
    where: {
      name: 'SUPER_ADMIN',
    },
  });

  for (const permission of permissionRecords) {

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdmin.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdmin.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('Super admin permissions assigned');

  console.log('Hospital database seeding completed!');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
