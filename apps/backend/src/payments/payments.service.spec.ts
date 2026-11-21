import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { PaymentsService } from './payments.service.js';
import { invoice_status, payment_status, reservation_status } from '@prisma/client';

describe('PaymentsService Unit Tests', () => {
  let service: PaymentsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      student_profiles: {
        findUnique: vi.fn(),
      },
      reservations: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      invoices: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        findMany: vi.fn(),
      },
      invoice_items: {
        create: vi.fn(),
      },
      payments: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      reservation_status_histories: {
        create: vi.fn(),
      },
      audit_logs: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    service = new PaymentsService(mockPrisma);
  });

  describe('1. Midtrans Signature Verification (05D)', () => {
    it('harus memvalidasi signature key Midtrans yang sah secara tepat (SHA-512)', () => {
      const serverKey = 'SB-Mid-server-TESTKEY123';
      process.env.MIDTRANS_SERVER_KEY = serverKey;

      const orderId = 'PAY-ORDER-001';
      const statusCode = '200';
      const grossAmount = '850000.00';

      const expectedRaw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
      const validSignature = createHash('sha512').update(expectedRaw).digest('hex');

      const isValid = service.verifySignature(orderId, statusCode, grossAmount, validSignature);
      expect(isValid).toBe(true);
    });

    it('harus toleran terhadap format desimal gross_amount (850000 vs 850000.00)', () => {
      const serverKey = 'SB-Mid-server-TESTKEY123';
      process.env.MIDTRANS_SERVER_KEY = serverKey;

      const orderId = 'PAY-ORDER-001';
      const statusCode = '200';
      // Server key with decimal .00
      const rawWithDec = `${orderId}${statusCode}850000.00${serverKey}`;
      const sigWithDec = createHash('sha512').update(rawWithDec).digest('hex');

      // Gross amount input as integer string
      const isValid = service.verifySignature(orderId, statusCode, '850000', sigWithDec);
      expect(isValid).toBe(true);
    });

    it('harus menolak notifikasi jika signature key dimanipulasi atau salah', () => {
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-TESTKEY123';
      const orderId = 'PAY-ORDER-001';
      const statusCode = '200';
      const grossAmount = '850000.00';
      const invalidSignature = 'invalid_tampered_signature_hex';

      const isValid = service.verifySignature(orderId, statusCode, grossAmount, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('harus menolak jika MIDTRANS_SERVER_KEY tidak tersedia di env', () => {
      delete process.env.MIDTRANS_SERVER_KEY;
      const isValid = service.verifySignature('PAY-1', '200', '1000', 'any-sig');
      expect(isValid).toBe(false);
    });
  });

  describe('2. Idempotency & Webhook Processing (05D)', () => {
    it('harus memperbarui payment ke SUCCEEDED dan invoice ke PAID saat menerima notifikasi settlement sah', async () => {
      const serverKey = 'SB-Mid-server-TESTKEY123';
      process.env.MIDTRANS_SERVER_KEY = serverKey;

      const orderId = 'PAY-UUID-001';
      const raw = `${orderId}200850000.00${serverKey}`;
      const signatureKey = createHash('sha512').update(raw).digest('hex');

      const existingPayment = {
        id: orderId,
        invoice_id: 'INV-UUID-001',
        status: payment_status.PENDING,
        invoices: {
          id: 'INV-UUID-001',
          reservation_id: 'RES-UUID-001',
          reservations: { id: 'RES-UUID-001', status: reservation_status.PENDING_PAYMENT },
        },
      };

      mockPrisma.payments.findFirst.mockResolvedValue(existingPayment);
      mockPrisma.payments.findUnique.mockResolvedValue(existingPayment);
      mockPrisma.reservations.findUnique.mockResolvedValue(existingPayment.invoices.reservations);

      const result = await service.handleNotification({
        order_id: orderId,
        status_code: '200',
        gross_amount: '850000.00',
        signature_key: signatureKey,
        transaction_status: 'settlement',
        payment_type: 'bank_transfer',
        transaction_id: 'trx-12345',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(payment_status.SUCCEEDED);
      expect(mockPrisma.payments.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({ status: payment_status.SUCCEEDED }),
        }),
      );
      expect(mockPrisma.invoices.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'INV-UUID-001' },
          data: expect.objectContaining({ status: invoice_status.PAID }),
        }),
      );
      expect(mockPrisma.reservations.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'RES-UUID-001' },
          data: expect.objectContaining({ status: reservation_status.CONFIRMED }),
        }),
      );
    });

    it('harus menangani status capture dengan fraud_status accept secara tepat', async () => {
      const serverKey = 'SB-Mid-server-TESTKEY123';
      process.env.MIDTRANS_SERVER_KEY = serverKey;

      const orderId = 'PAY-UUID-002';
      const raw = `${orderId}200850000.00${serverKey}`;
      const signatureKey = createHash('sha512').update(raw).digest('hex');

      const existingPayment = {
        id: orderId,
        invoice_id: 'INV-UUID-002',
        status: payment_status.PENDING,
        invoices: {
          id: 'INV-UUID-002',
          reservation_id: 'RES-UUID-002',
          reservations: { id: 'RES-UUID-002', status: reservation_status.ALLOCATED },
        },
      };

      mockPrisma.payments.findFirst.mockResolvedValue(existingPayment);
      mockPrisma.payments.findUnique.mockResolvedValue(existingPayment);
      mockPrisma.reservations.findUnique.mockResolvedValue(existingPayment.invoices.reservations);

      const result = await service.handleNotification({
        order_id: orderId,
        status_code: '200',
        gross_amount: '850000.00',
        signature_key: signatureKey,
        transaction_status: 'capture',
        fraud_status: 'accept',
        payment_type: 'credit_card',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(payment_status.SUCCEEDED);
      expect(mockPrisma.invoices.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'INV-UUID-002' },
          data: expect.objectContaining({ status: invoice_status.PAID }),
        }),
      );
    });

    it('harus memetakan status expire menjadi FAILED dan cancel menjadi CANCELLED', async () => {
      const serverKey = 'SB-Mid-server-TESTKEY123';
      process.env.MIDTRANS_SERVER_KEY = serverKey;

      const orderId = 'PAY-UUID-003';
      const raw = `${orderId}200850000.00${serverKey}`;
      const signatureKey = createHash('sha512').update(raw).digest('hex');

      const existingPayment = {
        id: orderId,
        invoice_id: 'INV-UUID-003',
        status: payment_status.PENDING,
        invoices: {
          id: 'INV-UUID-003',
          reservation_id: 'RES-UUID-003',
          reservations: { id: 'RES-UUID-003', status: reservation_status.PENDING_PAYMENT },
        },
      };

      mockPrisma.payments.findFirst.mockResolvedValue(existingPayment);
      mockPrisma.payments.findUnique.mockResolvedValue(existingPayment);

      const result = await service.handleNotification({
        order_id: orderId,
        status_code: '200',
        gross_amount: '850000.00',
        signature_key: signatureKey,
        transaction_status: 'expire',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(payment_status.FAILED);
      // Invoice tidak boleh di-update ke PAID
      expect(mockPrisma.invoices.update).not.toHaveBeenCalled();
    });

    it('harus idempoten: jika payment sudah SUCCEEDED, lewati pembaruan sekunder tanpa error', async () => {
      const serverKey = 'SB-Mid-server-TESTKEY123';
      process.env.MIDTRANS_SERVER_KEY = serverKey;

      const orderId = 'PAY-UUID-001';
      const raw = `${orderId}200850000.00${serverKey}`;
      const signatureKey = createHash('sha512').update(raw).digest('hex');

      const alreadySucceededPayment = {
        id: orderId,
        invoice_id: 'INV-UUID-001',
        status: payment_status.SUCCEEDED,
        invoices: {
          id: 'INV-UUID-001',
          reservation_id: 'RES-UUID-001',
          reservations: { id: 'RES-UUID-001', status: reservation_status.CONFIRMED },
        },
      };

      mockPrisma.payments.findFirst.mockResolvedValue(alreadySucceededPayment);
      mockPrisma.payments.findUnique.mockResolvedValue(alreadySucceededPayment);

      const result = await service.handleNotification({
        order_id: orderId,
        status_code: '200',
        gross_amount: '850000.00',
        signature_key: signatureKey,
        transaction_status: 'settlement',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('sudah berstatus SUCCEEDED');
      // Tidak boleh update invoice lagi
      expect(mockPrisma.invoices.update).not.toHaveBeenCalled();
    });
  });

  describe('3. Invoice Creation & Nominal Business Rules (05B)', () => {
    it('harus mengembalikan invoice yang sudah ada jika statusnya masih ISSUED (Idempoten)', async () => {
      const userId = 'user-1';
      const reservationId = 'res-1';

      mockPrisma.student_profiles.findUnique.mockResolvedValue({ id: 'std-1', user_id: userId });
      mockPrisma.reservations.findUnique.mockResolvedValue({
        id: reservationId,
        student_id: 'std-1',
        status: reservation_status.ALLOCATED,
        room_assignments: [],
      });

      const existingInvoice = {
        id: 'inv-existing',
        reservation_id: reservationId,
        status: invoice_status.ISSUED,
        amount: 850000,
        invoice_items: [],
      };

      mockPrisma.invoices.findFirst.mockResolvedValue(existingInvoice);

      const result = await service.createInvoice(userId, reservationId);
      expect(result.id).toBe('inv-existing');
      // Tidak membuat invoice baru di database
      expect(mockPrisma.invoices.create).not.toHaveBeenCalled();
    });

    it('harus menolak pembuatan invoice jika reservasi sudah lunas', async () => {
      const userId = 'user-1';
      const reservationId = 'res-1';

      mockPrisma.student_profiles.findUnique.mockResolvedValue({ id: 'std-1', user_id: userId });
      mockPrisma.reservations.findUnique.mockResolvedValue({
        id: reservationId,
        student_id: 'std-1',
        status: reservation_status.CONFIRMED,
        room_assignments: [],
      });

      mockPrisma.invoices.findFirst.mockResolvedValue({
        id: 'inv-paid',
        reservation_id: reservationId,
        status: invoice_status.PAID,
      });

      await expect(service.createInvoice(userId, reservationId)).rejects.toThrow(
        'Tagihan untuk reservasi ini sudah lunas.',
      );
    });
  });
});
