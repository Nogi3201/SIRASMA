import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { user_role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CsrfGuard } from '../auth/guards/csrf.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AcademicPeriodDto, BuildingDto, FacilityDto, RoomDto, RoomFacilityDto, RoomRateDto, StaffUpdateDto } from './dto.js';
import { ManagementService } from './management.service.js';
@Controller('management') @UseGuards(JwtAuthGuard, RolesGuard)
export class ManagementController {
 constructor(private readonly service: ManagementService) {}
 @Get('buildings') buildings() { return this.service.buildings(); }
 @Get('rooms') rooms(@Query('available') available?: string) { return this.service.rooms(available === 'true'); }
 @Get('facilities') facilities() { return this.service.facilities(); }
 @Get('staff') @Roles(user_role.ADMIN) staffs() { return this.service.staffs(); }
 @Get('students') @Roles(user_role.ADMIN, user_role.STAFF) students() { return this.service.students(); }
 @Get('periods') @Roles(user_role.ADMIN) periods() { return this.service.periods(); }
 @Get('audit-logs') @Roles(user_role.ADMIN) auditLogs() { return this.service.auditLogs(); }
 @Post('staff/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) updateStaff(@Param('id') id: string, @Body() dto: StaffUpdateDto) { return this.service.updateStaff(id, dto); }
 @Post('periods') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) createPeriod(@Body() dto: AcademicPeriodDto) { return this.service.createPeriod(dto); }
 @Patch('periods/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) updatePeriod(@Param('id') id: string, @Body() dto: AcademicPeriodDto) { return this.service.updatePeriod(id, dto); }
 @Delete('periods/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) deletePeriod(@Param('id') id: string) { return this.service.deletePeriod(id); }
 @Post('buildings') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) createBuilding(@Body() dto: BuildingDto) { return this.service.createBuilding(dto); }
 @Patch('buildings/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) updateBuilding(@Param('id') id: string, @Body() dto: BuildingDto) { return this.service.updateBuilding(id, dto); }
 @Delete('buildings/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) deleteBuilding(@Param('id') id: string) { return this.service.deleteBuilding(id); }
 @Post('rooms') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) createRoom(@Body() dto: RoomDto) { return this.service.createRoom(dto); }
 @Patch('rooms/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) updateRoom(@Param('id') id: string, @Body() dto: RoomDto) { return this.service.updateRoom(id, dto); }
 @Delete('rooms/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) deleteRoom(@Param('id') id: string) { return this.service.deleteRoom(id); }
 @Post('facilities') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) createFacility(@Body() dto: FacilityDto) { return this.service.createFacility(dto); }
 @Patch('facilities/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) updateFacility(@Param('id') id: string, @Body() dto: FacilityDto) { return this.service.updateFacility(id, dto); }
 @Delete('facilities/:id') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) deleteFacility(@Param('id') id: string) { return this.service.deleteFacility(id); }
 @Post('rooms/:id/facilities') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) roomFacility(@Param('id') id: string, @Body() dto: RoomFacilityDto) { return this.service.addRoomFacility(id, dto); }
 @Delete('rooms/:id/facilities/:facilityId') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) removeRoomFacility(@Param('id') id: string, @Param('facilityId') facilityId: string) { return this.service.removeRoomFacility(id, facilityId); }
 @Post('rooms/:id/rates') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN) rate(@Param('id') id: string, @Body() dto: RoomRateDto, @CurrentUser('sub') userId: string) { return this.service.addRate(id, dto, userId); }
}
