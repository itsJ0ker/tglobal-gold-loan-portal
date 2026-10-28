export type KaratValue = 18 | 22 | 24;

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

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Array<{
      field: string;
      message: string;
    }>;
    applicationId?: string;
  };
}

export interface LeadResponse {
  applicationId: string;
  status: string;
  customerName: string;
  maskedMobile: string;
  netWeightGrams: number;
  grossWeightGrams: number;
  karat: number;
  planId: string;
  planName?: string;
  pureGoldGrams: number;
  goldValueRupees: number;
  eligibleLoanRupees: number;
  createdAt: string;
}
