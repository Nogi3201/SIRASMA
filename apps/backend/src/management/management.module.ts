import { Module } from '@nestjs/common';
import { ManagementController } from './management.controller.js';
import { ManagementService } from './management.service.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({ imports: [AuthModule], controllers: [ManagementController], providers: [ManagementService] }) export class ManagementModule {}
