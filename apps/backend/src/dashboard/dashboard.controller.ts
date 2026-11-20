import { Controller, Get, UseGuards } from '@nestjs/common';
import { user_role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('admin') @Roles(user_role.ADMIN) async admin() { return { success: true, data: await this.dashboard.adminSummary() }; }
  @Get('staff') @Roles(user_role.STAFF, user_role.ADMIN) async staff() { return { success: true, data: await this.dashboard.staffSummary() }; }
  @Get('student') @Roles(user_role.USER) async student(@CurrentUser('sub') userId: string) { return { success: true, data: await this.dashboard.studentSummary(userId) }; }
}
