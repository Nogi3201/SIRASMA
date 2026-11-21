import { apiClient } from './api.js';

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number | string;
  unit_amount: number | string;
  line_total: number | string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  method: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
  amount: number | string;
  provider_name?: string | null;
  provider_reference?: string | null;
  paid_at?: string | null;
  failure_reason?: string | null;
  created_at: string;
  invoices?: {
    invoice_number: string;
    reservations?: {
      student_profiles?: {
        full_name: string;
        nim: string;
      };
    };
  };
};

export type Invoice = {
  id: string;
  reservation_id: string;
  invoice_number: string;
  amount: number | string;
  currency: string;
  status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  issued_at: string;
  due_at: string;
  paid_at?: string | null;
  created_at: string;
  invoice_items: InvoiceItem[];
  payments: Payment[];
  reservations?: {
    id: string;
    status: string;
    student_profiles?: {
      full_name: string;
      nim: string;
      study_program?: string;
    };
    academic_periods?: {
      name: string;
    };
    room_assignments?: {
      rooms: {
        room_number: string;
        buildings: {
          name: string;
        };
      };
    }[];
  };
};

export type PaymentSummary = {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalPayments: number;
  succeededPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  recentPayments: Payment[];
};

export type SnapTokenResponse = {
  token: string;
  redirectUrl: string;
  paymentId: string;
  orderId: string;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

/**
 * Load script Snap.js Midtrans Sandbox secara dinamis.
 */
export const loadSnapScript = (clientKey?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.snap) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById('midtrans-snap-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'midtrans-snap-script';
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    if (clientKey) {
      script.setAttribute('data-client-key', clientKey);
    }
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const paymentsService = {
  createInvoice: (reservationId: string) =>
    apiClient<Invoice>('/payments/invoices', {
      method: 'POST',
      body: JSON.stringify({ reservationId }),
    }),
  myInvoices: () => apiClient<Invoice[]>('/payments/invoices/my'),
  getInvoice: (id: string) => apiClient<Invoice>(`/payments/invoices/${id}`),
  createSnapToken: (invoiceId: string) =>
    apiClient<SnapTokenResponse>(`/payments/invoices/${invoiceId}/snap-token`, {
      method: 'POST',
    }),
  syncInvoice: (invoiceId: string) =>
    apiClient<{ success: boolean; message: string; invoice?: Invoice }>(
      `/payments/invoices/${invoiceId}/sync`,
      {
        method: 'POST',
      },
    ),
  adminSummary: () => apiClient<PaymentSummary>('/payments/admin/summary'),
  adminList: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return apiClient<Invoice[]>(`/payments/admin/list${queryStr}`);
  },
};
