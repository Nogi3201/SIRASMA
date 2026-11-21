import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  assignment_status,
  invoice_status,
  payment_method,
  payment_status,
  reservation_status,
  user_role,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import midtransClient from 'midtrans-client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper untuk mendapatkan instance Snap client Midtrans.
   */
  private getSnapClient() {
    const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim().replace(/^["']|["']$/g, '');
    const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim().replace(/^["']|["']$/g, '');
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    if (!serverKey) {
      throw new BadRequestException(
        'MIDTRANS_SERVER_KEY belum diatur pada backend. Silakan lengkapi konfigurasi .env backend.',
      );
    }

    return new (midtransClient as any).Snap({
      isProduction,
      serverKey,
      clientKey,
    });
  }

  /**
   * Hitung dan verifikasi signature key dari notifikasi Midtrans.
   * Format resmi Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
   */
  verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string,
  ): boolean {
    const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!serverKey || !signatureKey) return false;

    const ord = String(orderId).trim();
    const sc = String(statusCode).trim();
    const ga = String(grossAmount).trim();

    // 1. Format persis seperti yang dikirim
    const raw1 = `${ord}${sc}${ga}${serverKey}`;
    const hash1 = createHash('sha512').update(raw1).digest('hex');
    if (hash1.toLowerCase() === signatureKey.trim().toLowerCase()) return true;

    // 2. Toleransi desimal jika Midtrans mengirim integer atau .00
    const gaWithDec = ga.includes('.') ? ga : `${ga}.00`;
    const raw2 = `${ord}${sc}${gaWithDec}${serverKey}`;
    const hash2 = createHash('sha512').update(raw2).digest('hex');
    if (hash2.toLowerCase() === signatureKey.trim().toLowerCase()) return true;

    const gaWithoutDec = ga.replace(/\.00$/, '');
    const raw3 = `${ord}${sc}${gaWithoutDec}${serverKey}`;
    const hash3 = createHash('sha512').update(raw3).digest('hex');
    return hash3.toLowerCase() === signatureKey.trim().toLowerCase();
  }

  /**
   * Membuat tagihan (Invoice) untuk reservasi mahasiswa.
   * Nominal diambil dari database (room_rates), BUKAN dari input user.
   * Bersifat idempoten: jika tagihan aktif sudah ada, kembalikan tagihan yang ada.
   */
  async createInvoice(userId: string, reservationId: string) {
    const profile = await this.prisma.student_profiles.findUnique({
      where: { user_id: userId },
    });

    const reservation = await this.prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        room_assignments: {
          include: {
            rooms: {
              include: {
                buildings: true,
                room_rates: {
                  orderBy: { effective_from: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Data reservasi tidak ditemukan.');
    }

    if (profile && reservation.student_id !== profile.id) {
      throw new ForbiddenException('Anda tidak memiliki akses ke reservasi ini.');
    }

    if (
      reservation.status === reservation_status.CANCELLED ||
      reservation.status === reservation_status.EXPIRED
    ) {
      throw new BadRequestException('Reservasi ini sudah dibatalkan atau kedaluwarsa.');
    }

    // Periksa apakah sudah ada invoice untuk reservasi ini
    const existingInvoice = await this.prisma.invoices.findFirst({
      where: {
        reservation_id: reservationId,
        status: { in: [invoice_status.ISSUED, invoice_status.PAID] },
      },
      include: {
        invoice_items: true,
        payments: { orderBy: { created_at: 'desc' } },
      },
    });

    if (existingInvoice) {
      if (existingInvoice.status === invoice_status.PAID) {
        throw new ConflictException('Tagihan untuk reservasi ini sudah lunas.');
      }
      return existingInvoice;
    }

    // Tentukan nominal dari database room_rates
    const roomAssignment = reservation.room_assignments.find(
      (ra) => ra.status === assignment_status.RESERVED || ra.status === assignment_status.OCCUPIED,
    ) || reservation.room_assignments[0];

    let nominal = 750000; // fallback standard
    let roomDesc = 'Kamar Asrama';

    if (roomAssignment?.rooms) {
      const room = roomAssignment.rooms;
      roomDesc = `${room.buildings.name} - Kamar ${room.room_number}`;
      if (room.room_rates.length > 0) {
        nominal = Number(room.room_rates[0].amount);
      } else {
        nominal = room.capacity === 2 ? 850000 : room.capacity === 3 ? 700000 : 600000;
      }
    }

    const now = new Date();
    const invoiceNumber = `INV-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${reservation.id.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam batas bayar

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoices.create({
        data: {
          reservation_id: reservation.id,
          invoice_number: invoiceNumber,
          amount: nominal,
          currency: 'IDR',
          status: invoice_status.ISSUED,
          issued_at: now,
          due_at: dueAt,
        },
      });

      await tx.invoice_items.create({
        data: {
          invoice_id: invoice.id,
          description: `Biaya Sewa Asrama: ${roomDesc}`,
          quantity: 1,
          unit_amount: nominal,
          line_total: nominal,
        },
      });

      // Update status reservasi ke PENDING_PAYMENT jika belum
      if (
        reservation.status === reservation_status.SUBMITTED ||
        reservation.status === reservation_status.PENDING_DOCUMENTS ||
        reservation.status === reservation_status.ALLOCATED
      ) {
        await tx.reservations.update({
          where: { id: reservation.id },
          data: { status: reservation_status.PENDING_PAYMENT, payment_deadline: dueAt },
        });

        await tx.reservation_status_histories.create({
          data: {
            reservation_id: reservation.id,
            old_status: reservation.status,
            new_status: reservation_status.PENDING_PAYMENT,
            changed_by: userId,
            reason: 'Tagihan pembayaran diterbitkan.',
          },
        });
      }

      await tx.audit_logs.create({
        data: {
          user_id: userId,
          action: 'CREATE_INVOICE',
          entity_type: 'invoice',
          entity_id: invoice.id,
          new_values: { invoiceNumber, amount: nominal },
          result: 'SUCCESS',
        },
      });

      return tx.invoices.findUnique({
        where: { id: invoice.id },
        include: {
          invoice_items: true,
          payments: true,
        },
      });
    });
  }

  /**
   * Mengambil daftar invoice milik mahasiswa yang login.
   */
  async myInvoices(userId: string) {
    const profile = await this.prisma.student_profiles.findUnique({
      where: { user_id: userId },
    });
    if (!profile) throw new ForbiddenException('Profil mahasiswa tidak ditemukan.');

    return this.prisma.invoices.findMany({
      where: {
        reservations: {
          student_id: profile.id,
        },
      },
      include: {
        invoice_items: true,
        payments: { orderBy: { created_at: 'desc' } },
        reservations: {
          include: {
            academic_periods: true,
            room_assignments: {
              include: {
                rooms: {
                  include: {
                    buildings: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Mengambil detail satu invoice berdasarkan ID.
   */
  async getInvoice(id: string, userId: string, role: string) {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
      include: {
        invoice_items: true,
        payments: { orderBy: { created_at: 'desc' } },
        reservations: {
          include: {
            student_profiles: {
              include: { users: { select: { email: true, phone_number: true } } },
            },
            academic_periods: true,
            room_assignments: {
              include: {
                rooms: {
                  include: { buildings: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan.');

    if (role === user_role.USER && invoice.reservations.student_profiles.user_id !== userId) {
      throw new ForbiddenException('Anda tidak berhak melihat invoice ini.');
    }

    return invoice;
  }

  /**
   * Membuat Midtrans Snap Token untuk invoice tertentu.
   * Server Key disimpan di backend dan tidak pernah dikirim ke frontend.
   */
  async createSnapToken(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        invoice_items: true,
        reservations: {
          include: {
            student_profiles: {
              include: { users: true },
            },
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Tagihan tidak ditemukan.');

    if (invoice.reservations.student_profiles.user_id !== userId) {
      throw new ForbiddenException('Anda tidak berhak melakukan pembayaran untuk tagihan ini.');
    }

    if (invoice.status === invoice_status.PAID) {
      throw new BadRequestException('Tagihan ini sudah lunas.');
    }

    if (
      invoice.status === invoice_status.CANCELLED ||
      invoice.status === invoice_status.EXPIRED
    ) {
      throw new BadRequestException('Status tagihan tidak valid untuk pembayaran.');
    }

    const snap = this.getSnapClient();

    // Buat record pembayaran PENDING baru untuk percobaan ini
    const payment = await this.prisma.payments.create({
      data: {
        invoice_id: invoice.id,
        method: payment_method.GATEWAY,
        status: payment_status.PENDING,
        amount: invoice.amount,
        provider_name: 'MIDTRANS',
        idempotency_key: `PAY-${invoice.id}-${Date.now()}`,
      },
    });

    const student = invoice.reservations.student_profiles;
    const parameter = {
      transaction_details: {
        order_id: payment.id,
        gross_amount: Math.round(Number(invoice.amount)),
      },
      customer_details: {
        first_name: student.full_name,
        email: student.users.email,
        phone: student.users.phone_number || undefined,
      },
      item_details: invoice.invoice_items.map((item) => ({
        id: item.id.slice(0, 50),
        price: Math.round(Number(item.unit_amount)),
        quantity: Math.max(1, Math.round(Number(item.quantity))),
        name: item.description.slice(0, 50),
      })),
    };

    try {
      this.logger.log(`[Midtrans Snap] Creating transaction for payment ${payment.id}, gross_amount: ${parameter.transaction_details.gross_amount}`);
      const snapResponse = await snap.createTransaction(parameter);

      // Simpan provider_reference dengan payment.id/order_id
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: { provider_reference: payment.id },
      });

      return {
        token: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
        paymentId: payment.id,
        orderId: payment.id,
      };
    } catch (err: any) {
      this.logger.error(`[Midtrans Snap] Failed to create transaction for payment ${payment.id}: ${err?.message}`);
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          status: payment_status.FAILED,
          failure_reason: err?.message || 'Gagal membuat transaksi di Midtrans',
        },
      });
      throw new BadRequestException(
        err?.ApiResponse?.status_message || err?.message || 'Gagal menghubungkan ke Midtrans Snap.',
      );
    }
  }

  /**
   * Logika inti pemrosesan status pembayaran dari Midtrans (Webhook maupun Direct Sync).
   * Menjamin konsistensi database: Payment -> Invoice -> Reservation -> History & Audit.
   */
  private async processPaymentStatus(
    payment: any,
    payload: {
      transaction_status: string;
      fraud_status?: string;
      payment_type?: string;
      transaction_id?: string;
      status_message?: string;
      gross_amount?: string;
      order_id?: string;
    },
  ) {
    const {
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      status_message,
      gross_amount,
      order_id,
    } = payload;

    let nextStatus: payment_status = payment_status.PENDING;
    let isSuccess = false;

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        nextStatus = payment_status.SUCCEEDED;
        isSuccess = true;
      } else if (fraud_status === 'challenge') {
        nextStatus = payment_status.PROCESSING;
      }
    } else if (transaction_status === 'settlement') {
      nextStatus = payment_status.SUCCEEDED;
      isSuccess = true;
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire' ||
      transaction_status === 'refund' ||
      transaction_status === 'partial_refund' ||
      transaction_status === 'chargeback' ||
      transaction_status === 'partial_chargeback'
    ) {
      nextStatus = transaction_status === 'expire' ? payment_status.FAILED : payment_status.CANCELLED;
    } else if (transaction_status === 'pending') {
      nextStatus = payment_status.PENDING;
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.payments.findUnique({
        where: { id: payment.id },
      });

      if (!current) throw new NotFoundException('Data pembayaran tidak ditemukan.');

      // Idempotency: Jika status di database sudah SUCCEEDED, abaikan proses ulang
      if (current.status === payment_status.SUCCEEDED) {
        this.logger.log(`[Midtrans Idempotent] Payment ${payment.id} already SUCCEEDED. Skipping duplicate execution.`);
        return { success: true, status: current.status, message: 'Pembayaran sudah berstatus SUCCEEDED sebelumnya.' };
      }

      await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          paid_at: isSuccess ? new Date() : current.paid_at,
          failure_reason: isSuccess ? null : status_message || transaction_status,
          provider_reference: transaction_id || current.provider_reference || payment.id,
        },
      });

      if (isSuccess) {
        // Update status Invoice ke PAID
        await tx.invoices.update({
          where: { id: payment.invoice_id },
          data: {
            status: invoice_status.PAID,
            paid_at: new Date(),
          },
        });

        // Update status Reservasi ke CONFIRMED
        const reservationId = payment.invoices.reservation_id;
        const currentReservation = await tx.reservations.findUnique({
          where: { id: reservationId },
        });

        if (currentReservation && currentReservation.status !== reservation_status.CONFIRMED) {
          await tx.reservations.update({
            where: { id: reservationId },
            data: { status: reservation_status.CONFIRMED },
          });

          await tx.reservation_status_histories.create({
            data: {
              reservation_id: reservationId,
              old_status: currentReservation.status,
              new_status: reservation_status.CONFIRMED,
              reason: `Pembayaran Midtrans berhasil via ${payment_type || 'GATEWAY'}.`,
            },
          });
        }

        await tx.audit_logs.create({
          data: {
            action: 'PAYMENT_CONFIRMED',
            entity_type: 'payment',
            entity_id: payment.id,
            new_values: {
              orderId: order_id || payment.id,
              grossAmount: gross_amount,
              paymentType: payment_type,
              transactionStatus: transaction_status,
            },
            result: 'SUCCESS',
          },
        });

        this.logger.log(
          `[Midtrans Success] Payment ${payment.id} -> SUCCEEDED, Invoice ${payment.invoice_id} -> PAID, Reservation ${payment.invoices.reservation_id} -> CONFIRMED`,
        );
      } else {
        this.logger.log(`[Midtrans Status] Payment ${payment.id} status updated to: ${nextStatus}`);
      }

      return { success: true, status: nextStatus };
    });
  }

  /**
   * Menangani notifikasi webhook Midtrans dengan verifikasi signature dan idempotency.
   */
  async handleNotification(notification: any) {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      status_message,
    } = notification || {};

    this.logger.log(
      `[Midtrans Webhook] Received webhook: order_id=${order_id}, status=${transaction_status}, gross_amount=${gross_amount}, type=${payment_type}`,
    );

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      this.logger.warn(`[Midtrans Webhook] Rejected: Incomplete notification payload for order_id: ${order_id}`);
      throw new BadRequestException('Payload notifikasi Midtrans tidak lengkap.');
    }

    const isValidSignature = this.verifySignature(
      order_id,
      status_code,
      gross_amount,
      signature_key,
    );

    if (!isValidSignature) {
      this.logger.warn(`[Midtrans Webhook] Rejected: Invalid signature key for order_id: ${order_id}`);
      throw new UnauthorizedException('Signature notifikasi Midtrans tidak valid.');
    }

    // Cari payment record (dukung UUID order_id maupun order_id string lainnya)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
    const payment = await this.prisma.payments.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: order_id }] : []),
          { provider_reference: order_id },
          { idempotency_key: order_id },
          { invoices: { invoice_number: order_id } },
        ],
      },
      include: {
        invoices: {
          include: {
            reservations: true,
          },
        },
      },
    });

    if (!payment) {
      this.logger.error(`[Midtrans Webhook] Payment not found for order_id: ${order_id}`);
      throw new NotFoundException(`Pembayaran dengan order_id ${order_id} tidak ditemukan.`);
    }

    return this.processPaymentStatus(payment, {
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      status_message,
      gross_amount,
      order_id,
    });
  }

  /**
   * Melakukan sinkronisasi aktif status transaksi langsung dari Midtrans API Sandbox.
   * Endpoint ini memverifikasi status resmi langsung ke server Midtrans (tanpa bergantung pada kedatangan webhook).
   */
  async syncInvoice(invoiceId: string, userId: string, role: string) {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        payments: { orderBy: { created_at: 'desc' } },
        reservations: {
          include: {
            student_profiles: true,
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Tagihan tidak ditemukan.');

    if (role === user_role.USER && invoice.reservations.student_profiles.user_id !== userId) {
      throw new ForbiddenException('Anda tidak berhak menyinkronkan tagihan ini.');
    }

    // Ambil pembayaran terakhir
    const latestPayment = invoice.payments[0];
    if (!latestPayment) {
      return { success: true, message: 'Belum ada transaksi pembayaran yang dicoba.', invoice };
    }

    if (latestPayment.status === payment_status.SUCCEEDED && invoice.status === invoice_status.PAID) {
      return { success: true, message: 'Tagihan sudah berstatus lunas.', invoice };
    }

    const snap = this.getSnapClient();
    try {
      this.logger.log(`[Midtrans Sync] Checking status directly from Midtrans API for order: ${latestPayment.id}`);
      const statusResponse = await snap.transaction.status(latestPayment.id);

      this.logger.log(
        `[Midtrans Sync] Midtrans API responded: order_id=${statusResponse?.order_id}, status=${statusResponse?.transaction_status}, fraud=${statusResponse?.fraud_status}`,
      );

      // Muat ulang payment dengan relasi invoice dan reservasi
      const fullPayment = await this.prisma.payments.findUnique({
        where: { id: latestPayment.id },
        include: {
          invoices: {
            include: {
              reservations: true,
            },
          },
        },
      });

      if (fullPayment && statusResponse?.transaction_status) {
        await this.processPaymentStatus(fullPayment, statusResponse);
      }

      // Ambil data invoice terbaru setelah sinkronisasi
      const refreshedInvoice = await this.getInvoice(invoiceId, userId, role);
      return {
        success: true,
        message: `Sinkronisasi berhasil: status ${statusResponse?.transaction_status}`,
        invoice: refreshedInvoice,
      };
    } catch (err: any) {
      this.logger.warn(`[Midtrans Sync] Failed to get transaction status from Midtrans: ${err?.message}`);
      return {
        success: false,
        message: err?.ApiResponse?.status_message || err?.message || 'Gagal memeriksa status ke Midtrans.',
        invoice,
      };
    }
  }

  /**
   * Ringkasan analitik pembayaran untuk dashboard ADMIN dan STAFF.
   */
  async getAdminSummary() {
    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalPayments,
      succeededPayments,
      pendingPayments,
      failedPayments,
      recentPayments,
    ] = await Promise.all([
      this.prisma.invoices.count(),
      this.prisma.invoices.count({ where: { status: invoice_status.PAID } }),
      this.prisma.invoices.count({ where: { status: invoice_status.ISSUED } }),
      this.prisma.payments.count(),
      this.prisma.payments.count({ where: { status: payment_status.SUCCEEDED } }),
      this.prisma.payments.count({ where: { status: payment_status.PENDING } }),
      this.prisma.payments.count({
        where: { status: { in: [payment_status.FAILED, payment_status.CANCELLED] } },
      }),
      this.prisma.payments.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          invoices: {
            include: {
              reservations: {
                include: {
                  student_profiles: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const aggregatePaid = await this.prisma.invoices.aggregate({
      where: { status: invoice_status.PAID },
      _sum: { amount: true },
    });

    const aggregatePending = await this.prisma.invoices.aggregate({
      where: { status: invoice_status.ISSUED },
      _sum: { amount: true },
    });

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalPayments,
      succeededPayments,
      pendingPayments,
      failedPayments,
      totalPaidAmount: Number(aggregatePaid._sum.amount ?? 0),
      totalPendingAmount: Number(aggregatePending._sum.amount ?? 0),
      recentPayments,
    };
  }

  /**
   * Daftar seluruh invoice dan pembayaran untuk ADMIN dan STAFF.
   */
  async getAdminPaymentList(query: { status?: string; search?: string }) {
    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as invoice_status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { invoice_number: { contains: q, mode: 'insensitive' } },
        {
          reservations: {
            student_profiles: {
              OR: [
                { full_name: { contains: q, mode: 'insensitive' } },
                { nim: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    return this.prisma.invoices.findMany({
      where,
      include: {
        invoice_items: true,
        payments: { orderBy: { created_at: 'desc' } },
        reservations: {
          include: {
            student_profiles: true,
            academic_periods: true,
            room_assignments: {
              include: {
                rooms: {
                  include: { buildings: true },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
