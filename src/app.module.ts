import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

import { HospitalsModule } from './modules/hospitals/hospitals.module.js';
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { WardsModule } from './modules/wards/wards.module.js';
import { BedsModule } from './modules/beds/beds.module.js';
import { HospitalServicesModule } from './modules/hospital-services/hospital-services.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { PatientsModule } from './modules/patients/patients.module.js';
import { OpdModule } from './modules/opd/opd.module.js';
import { IpdModule } from './modules/ipd/ipd.module.js';
import { LaboratoryModule } from './modules/laboratory/laboratory.module.js';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module.js';
import { RadiologyModule } from './modules/radiology/radiology.module.js';
import { EmergencyModule } from './modules/emergency/emergency.module.js';
import { StaffRostersModule } from './modules/staff-rosters/staff-rosters.module.js';
import { StaffAttendanceModule } from './modules/staff-attendance/staff-attendance.module.js';
import { StaffLeaveModule } from './modules/staff-leave/staff-leave.module.js';
import { AssetManagementModule } from './modules/asset-management/asset-management.module.js';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    DatabaseModule,
    HealthModule,

    // Hospital organization modules
    HospitalsModule,
    DepartmentsModule,
    WardsModule,
    BedsModule,
    HospitalServicesModule,
    AuthModule,
    RbacModule,
    PatientsModule,
    OpdModule,
    IpdModule,
    LaboratoryModule,
    PharmacyModule,
    RadiologyModule,
    EmergencyModule,
    StaffRostersModule,
    StaffAttendanceModule,
    StaffLeaveModule,
    AssetManagementModule
  ],
})
export class AppModule {}