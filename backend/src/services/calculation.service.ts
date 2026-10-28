import { KaratValue, PlanQuote, QuoteCalculationResult } from '../types';

export const DEFAULT_MOCK_GOLD_RATE_24K = 7000;

export interface PlanCalculationInput {
  id: string;
  name: string;
  annualInterestRate: number;
  maxLtv: number;
  tenureMonths: number;
  repaymentType: string;
}

/**
 * Pure calculation service for gold valuation and eligible loan amounts.
 * Adheres strictly to the TGlobal assignment specification:
 * - pureGoldGrams = netWeightGrams * (karat / 24)
 * - goldValue = pureGoldGrams * rate24kPerGram
 * - eligibleLoan = floor( goldValue * min(plan.maxLtv, 0.75) )
 * - Max LTV capped strictly at 0.75 (75%)
 * - Integer whole rupees for eligible loans
 */
export class CalculationService {
  /**
   * Calculates pure gold grams
   */
  static calculatePureGold(netWeightGrams: number, karat: KaratValue): number {
    const rawPure = (netWeightGrams * karat) / 24;
    // Round to 3 decimal places for grams
    return Math.round(rawPure * 1000) / 1000;
  }

  /**
   * Calculates market gold value in Rupees
   */
  static calculateGoldValue(pureGoldGrams: number, rate24kPerGram: number = DEFAULT_MOCK_GOLD_RATE_24K): number {
    const value = pureGoldGrams * rate24kPerGram;
    // Round to 2 decimal places for Rupee currency
    return Math.round(value * 100) / 100;
  }

  /**
   * Calculates eligible loan amount for a given plan
   */
  static calculateEligibleLoan(goldValueRupees: number, planMaxLtv: number): number {
    const effectiveLtv = Math.min(planMaxLtv, 0.75);
    return Math.floor(goldValueRupees * effectiveLtv);
  }

  /**
   * Optional helper for monthly EMI estimate
   */
  static calculateMonthlyEmi(principal: number, annualRatePct: number, tenureMonths: number): number {
    if (principal <= 0 || tenureMonths <= 0) return 0;
    const monthlyRate = annualRatePct / 12 / 100;
    if (monthlyRate === 0) return Math.round(principal / tenureMonths);
    const emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);
  }

  /**
   * Generates complete quote calculation for a given set of weights, karat, and plans
   */
  static generateQuote(
    netWeightGrams: number,
    grossWeightGrams: number,
    karat: KaratValue,
    plans: PlanCalculationInput[],
    goldRatePerGram: number = DEFAULT_MOCK_GOLD_RATE_24K
  ): QuoteCalculationResult {
    const pureGoldGrams = this.calculatePureGold(netWeightGrams, karat);
    const goldValueRupees = this.calculateGoldValue(pureGoldGrams, goldRatePerGram);

    const calculatedPlans: PlanQuote[] = plans.map((plan) => {
      const eligibleLoanRupees = this.calculateEligibleLoan(goldValueRupees, plan.maxLtv);
      const monthlyEmiRupees =
        plan.repaymentType === 'EMI'
          ? this.calculateMonthlyEmi(eligibleLoanRupees, plan.annualInterestRate, plan.tenureMonths)
          : undefined;

      return {
        planId: plan.id,
        planName: plan.name,
        annualInterestRate: plan.annualInterestRate,
        maxLtv: Math.min(plan.maxLtv, 0.75),
        tenureMonths: plan.tenureMonths,
        repaymentType: plan.repaymentType,
        eligibleLoanRupees,
        monthlyEmiRupees,
      };
    });

    return {
      netWeightGrams,
      grossWeightGrams,
      karat,
      pureGoldGrams,
      goldRatePerGram,
      goldValueRupees,
      plans: calculatedPlans,
    };
  }
}
