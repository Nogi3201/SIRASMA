import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OccupancyController } from './occupancy.controller.js';
import { OccupancyService } from './occupancy.service.js';
@Module({ imports: [PrismaModule, AuthModule], controllers: [OccupancyController], providers: [OccupancyService] }) export class OccupancyModule {}
