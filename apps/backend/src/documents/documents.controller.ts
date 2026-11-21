import { Body, Controller, Get, Header, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { user_role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CsrfGuard } from '../auth/guards/csrf.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ReviewDocumentDto, UploadDocumentDto } from './dto.js';
import { DocumentsService } from './documents.service.js';
@Controller('documents') @UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}
  @Get('mine') @Roles(user_role.USER) mine(@CurrentUser('sub') userId: string) { return this.service.mine(userId); }
  @Get() @Roles(user_role.ADMIN, user_role.STAFF) list() { return this.service.list(); }
  @Post() @UseGuards(CsrfGuard) @Roles(user_role.USER) upload(@CurrentUser('sub') userId: string, @Body() dto: UploadDocumentDto) { return this.service.upload(userId, dto); }
  @Patch(':id/review') @UseGuards(CsrfGuard) @Roles(user_role.ADMIN, user_role.STAFF) review(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body() dto: ReviewDocumentDto) { return this.service.review(id, userId, dto); }
  @Get(':id/file') async file(@Param('id') id: string, @CurrentUser('sub') userId: string, @CurrentUser('role') role: user_role, @Res() response: any) { const result = await this.service.file(id, userId, role); response.setHeader('Content-Type', result.contentType); response.setHeader('Content-Disposition', 'inline'); response.setHeader('Cache-Control', 'private, no-store'); response.setHeader('ETag', result.etag); response.send(result.content); }
}
