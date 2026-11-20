import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({ imports: [AuthModule], controllers: [ReservationsController], providers: [ReservationsService] }) export class ReservationsModule {}
