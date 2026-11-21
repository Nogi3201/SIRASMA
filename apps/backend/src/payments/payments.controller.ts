import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { user_role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CsrfGuard } from '../auth/guards/csrf.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateInvoiceDto, PaymentFilterDto } from './dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly service: PaymentsService) {}

  /**
   * Endpoint publik penerima webhook dari Midtrans.
   * Tidak menggunakan JwtAuthGuard atau CsrfGuard karena dipanggil langsung oleh server Midtrans.
   * Keamanan dijamin via verifikasi HMAC SHA-512 signature_key.
   */
  @Post('notification')
  @HttpCode(HttpStatus.OK)
  handleNotification(@Body() body: any) {
    this.logger.log(`[Midtrans Controller] Webhook notification received for order: ${body?.order_id}`);
    return this.service.handleNotification(body);
  }

  /**
   * Sinkronisasi aktif status transaksi langsung ke API Midtrans.
   * Digunakan oleh USER setelah menyelesaikan Snap, atau STAFF/ADMIN saat memeriksa status.
   */
  @Post('invoices/:id/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.USER, user_role.STAFF, user_role.ADMIN)
  syncInvoice(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    this.logger.log(`[Midtrans Controller] Manual sync requested for invoice: ${id} by user: ${userId}`);
    return this.service.syncInvoice(id, userId, role);
  }

  /**
   * Mahasiswa menerbitkan atau mengambil invoice untuk reservasi mereka.
   */
  @Post('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(user_role.USER, user_role.STAFF, user_role.ADMIN)
  createInvoice(@CurrentUser('sub') userId: string, @Body() dto: CreateInvoiceDto) {
    return this.service.createInvoice(userId, dto.reservationId);
  }

  /**
   * Mahasiswa melihat daftar seluruh tagihan mereka.
   */
  @Get('invoices/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.USER)
  myInvoices(@CurrentUser('sub') userId: string) {
    return this.service.myInvoices(userId);
  }

  /**
   * Melihat detail satu invoice.
   */
  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.USER, user_role.STAFF, user_role.ADMIN)
  getInvoice(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.service.getInvoice(id, userId, role);
  }

  /**
   * Membuat Midtrans Snap Token untuk invoice tertentu.
   */
  @Post('invoices/:id/snap-token')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(user_role.USER)
  createSnapToken(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.createSnapToken(userId, id);
  }

  /**
   * Ringkasan analitik pembayaran untuk staf dan admin.
   */
  @Get('admin/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.ADMIN, user_role.STAFF)
  adminSummary() {
    return this.service.getAdminSummary();
  }

  /**
   * Daftar pembayaran dan tagihan untuk staf dan admin.
   */
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.ADMIN, user_role.STAFF)
  adminList(@Query() query: PaymentFilterDto) {
    return this.service.getAdminPaymentList(query);
  }
}
