export type KaratValue = 18 | 22 | 24;

export interface LoanScheme {
  id: string;
  name: string;
  annualInterestRate: number;
  maxLtv: number;
  tenureMonths: number;
  repaymentType: string;
  description: string;
}

export interface PlanQuote {
  planId: string;
  planName: string;
  annualInterestRate: number;
  maxLtv: number;
  tenureMonths: number;
  repaymentType: string;
  eligibleLoanRupees: number;
  monthlyEmiRupees?: number;
}

export interface QuoteCalculationResult {
  netWeightGrams: number;
  grossWeightGrams: number;
  karat: KaratValue;
  pureGoldGrams: number;
  goldRatePerGram: number;
  goldValueRupees: number;
  plans: PlanQuote[];
}

export interface LeadFormData {
  customerName: string;
  mobileNumber: string;
  grossWeightGrams: string;
  netWeightGrams: string;
  karat: KaratValue;
  selectedPlanId: string;
}

export interface LeadSubmissionResult {
  replayed: boolean;
  applicationId: string;
  status: string;
  customerName: string;
  maskedMobile: string;
  planId: string;
  planName: string;
  netWeightGrams: number;
  grossWeightGrams: number;
  karat: number;
  pureGoldGrams: number;
  goldRatePerGram: number;
  goldValueRupees: number;
  eligibleLoanRupees: number;
  createdAt: string;
}

export interface LeadItem {
  applicationId: string;
  status: string;
  customerName: string;
  maskedMobile: string;
  netWeightGrams: number;
  grossWeightGrams: number;
  karat: number;
  planId: string;
  planName: string;
  pureGoldGrams: number;
  goldValueRupees: number;
  eligibleLoanRupees: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  requiresConfirmation?: boolean;
  confirmationPayload?: any;
  toolCallsExecuted?: Array<{
    name: string;
    args: any;
    result: any;
  }>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  fields?: Array<{ field: string; message: string }>;
  applicationId?: string;
}
