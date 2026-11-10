import { PrismaService } from './prisma.service.js';
import { permissions, roles } from './rbac-seed-data.js';

async function main() {
  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    // Create or update permissions.
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: {
          name: permission.description,
          description: permission.description,
        },
        create: {
          ...permission,
          name: permission.description,
        },
      });
    }

    // Create roles and their permission relationships.
    for (const roleData of roles) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
          isSystem: true,
        },
        create: {
          name: roleData.name,
          description: roleData.description,
          isSystem: true,
        },
      });

      for (const permissionCode of roleData.permissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: permissionCode },
        });

        if (!permission) {
          throw new Error(`Permission not found: ${permissionCode}`);
        }

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // Assign SYSTEM_ADMIN to an existing bootstrap user.
    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();

    if (adminEmail) {
      const admin = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (!admin) {
        throw new Error(
          `Bootstrap admin user not found: ${adminEmail}`,
        );
      }

      const adminRole = await prisma.role.findUnique({
        where: { name: 'SYSTEM_ADMIN' },
      });

      if (!adminRole) {
        throw new Error('SYSTEM_ADMIN role not found');
      }

      const existingAssignment = await prisma.userRole.findFirst({
        where: {
          userId: admin.id,
          roleId: adminRole.id,
          hospitalId: null,
        },
      });

      if (!existingAssignment) {
        await prisma.userRole.create({
          data: {
            userId: admin.id,
            roleId: adminRole.id,
            hospitalId: null,
          },
        });
      }

      console.log(`SYSTEM_ADMIN assigned to ${adminEmail}`);
    } else {
      console.log(
        'BOOTSTRAP_ADMIN_EMAIL not configured; no admin user assigned.',
      );
    }

    console.log('RBAC seed completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('RBAC seed failed:', error);
  process.exit(1);
});