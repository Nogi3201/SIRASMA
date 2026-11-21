import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { user_role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CsrfGuard } from '../auth/guards/csrf.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CheckoutDto, CheckoutReviewDto } from './dto.js';
import { OccupancyService } from './occupancy.service.js';
@Controller('occupancy') @UseGuards(JwtAuthGuard, RolesGuard)
export class OccupancyController { constructor(private readonly service: OccupancyService) {} @Get('mine') @Roles(user_role.USER) mine(@CurrentUser('sub') id: string) { return this.service.mine(id); } @Get() @Roles(user_role.ADMIN, user_role.STAFF) list() { return this.service.list(); } @Post(':id/check-in') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN, user_role.STAFF) checkIn(@Param('id') id: string, @CurrentUser('sub') userId: string) { return this.service.checkIn(id, userId); } @Post(':id/check-out') @UseGuards(CsrfGuard) @Roles(user_role.USER) request(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: CheckoutDto) { return this.service.requestCheckout(id, userId, dto); } @Patch('check-out/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN, user_role.STAFF) review(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: CheckoutReviewDto) { return this.service.reviewCheckout(id, userId, dto); } }
