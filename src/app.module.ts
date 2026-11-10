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
  ],
})
export class AppModule {}