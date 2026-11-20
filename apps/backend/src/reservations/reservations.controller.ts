import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { user_role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CsrfGuard } from '../auth/guards/csrf.guard.js';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto.js';
import { ReservationsService } from './reservations.service.js';
@Controller('reservations') @UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
 constructor(private readonly service: ReservationsService) {}
 @Get('mine') @Roles(user_role.USER) mine(@CurrentUser('sub') userId: string) { return this.service.mine(userId); }
 @Post() @UseGuards(CsrfGuard) @Roles(user_role.USER) create(@CurrentUser('sub') userId: string, @Body() dto: CreateReservationDto) { return this.service.create(userId, dto); }
 @Patch(':id/cancel') @UseGuards(CsrfGuard) @Roles(user_role.USER) cancel(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body('reason') reason?: string) { return this.service.cancelMine(id, userId, reason); }
 @Get() @Roles(user_role.ADMIN, user_role.STAFF) list() { return this.service.list(); }
 @Get(':id') one(@Param('id') id: string, @CurrentUser('sub') userId: string, @CurrentUser('role') role: string) { return this.service.one(id, userId, role); }
 @Patch(':id/status') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN, user_role.STAFF) status(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: UpdateReservationStatusDto) { return this.service.changeStatus(id, userId, dto); }
}
