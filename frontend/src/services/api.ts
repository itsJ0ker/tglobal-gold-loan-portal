import {
  LoanScheme,
  QuoteCalculationResult,
  LeadSubmissionResult,
  LeadItem,
  KaratValue,
  ApiErrorDetail,
} from '../types';

const API_BASE = '/api/v1';

export class ApiServiceError extends Error {
  code: string;
  statusCode: number;
  fields?: Array<{ field: string; message: string }>;
  applicationId?: string;

  constructor(statusCode: number, detail: ApiErrorDetail) {
    super(detail.message);
    this.name = 'ApiServiceError';
    this.statusCode = statusCode;
    this.code = detail.code;
    this.fields = detail.fields;
    this.applicationId = detail.applicationId;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorDetail: ApiErrorDetail = data.error || {
      code: 'UNKNOWN_ERROR',
      message: res.statusText || 'An unexpected error occurred',
    };
    throw new ApiServiceError(res.status, errorDetail);
  }
  return data as T;
}

export const ApiService = {
  /**
   * GET /api/v1/loan-schemes
   */
  async getLoanSchemes(): Promise<LoanScheme[]> {
    const res = await fetch(`${API_BASE}/loan-schemes`);
    const json = await handleResponse<{ data: LoanScheme[] }>(res);
    return json.data;
  },

  /**
   * POST /api/v1/quotes
   */
  async calculateQuote(params: {
    netWeightGrams: number;
    grossWeightGrams: number;
    karat: KaratValue;
  }): Promise<QuoteCalculationResult> {
    const res = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await handleResponse<QuoteCalculationResult>(res);
  },

  /**
   * POST /api/v1/leads
   */
  async submitLead(
    payload: {
      customerName: string;
      mobileNumber: string;
      grossWeightGrams: number;
      netWeightGrams: number;
      karat: KaratValue;
      planId: string;
    },
    idempotencyKey?: string
  ): Promise<LeadSubmissionResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await handleResponse<LeadSubmissionResult>(res);
  },

  /**
   * GET /api/v1/leads (Admin)
   */
  async getLeads(
    filters: { planId?: string; status?: string; page?: number; limit?: number },
    adminKey: string = 'admin_gold_secret_key_2026'
  ): Promise<{
    data: LeadItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (filters.planId) query.set('planId', filters.planId);
    if (filters.status) query.set('status', filters.status);
    if (filters.page) query.set('page', String(filters.page));
    if (filters.limit) query.set('limit', String(filters.limit));

    const res = await fetch(`${API_BASE}/leads?${query.toString()}`, {
      headers: {
        'x-admin-key': adminKey,
      },
    });
    return await handleResponse<{
      data: LeadItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(res);
  },

  /**
   * PATCH /api/v1/leads/:id/status (Admin)
   */
  async updateLeadStatus(
    id: string,
    status: string,
    reason?: string,
    adminKey: string = 'admin_gold_secret_key_2026'
  ): Promise<{ applicationId: string; status: string; updatedAt: string }> {
    const res = await fetch(`${API_BASE}/leads/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ status, reason }),
    });
    const json = await handleResponse<{ data: any }>(res);
    return json.data;
  },

  /**
   * POST /api/v1/chat (AI Assistant)
   */
  async sendChatMessage(payload: {
    messages: Array<{ role: string; content: string }>;
    pendingConfirmation?: any;
  }): Promise<{
    message: any;
    toolCallsExecuted?: Array<{ name: string; args: any; result: any }>;
    pendingConfirmation?: any;
  }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await handleResponse<any>(res);
  },
};
