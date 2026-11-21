import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ManagementModule } from './management/management.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { OccupancyModule } from './occupancy/occupancy.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { validateEnvironment } from './config/environment.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnvironment,
    }),
    PrismaModule,
    DashboardModule,
    ManagementModule,
    ReservationsModule,
    DocumentsModule,
    OccupancyModule,
    PaymentsModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
