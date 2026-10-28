import { describe, it, expect } from 'vitest';
import { CalculationService } from '../src/services/calculation.service';
import { KaratValue } from '../src/types';

describe('Financial Calculations Unit Tests', () => {
  const plans = [
    {
      id: 'PLAN_BULLET_01',
      name: 'Bullet Repayment',
      annualInterestRate: 12.0,
      maxLtv: 0.70,
      tenureMonths: 12,
      repaymentType: 'BULLET',
    },
    {
      id: 'PLAN_EMI_01',
      name: 'Monthly EMI',
      annualInterestRate: 10.5,
      maxLtv: 0.75,
      tenureMonths: 12,
      repaymentType: 'EMI',
    },
  ];

  // Test Case 1: 45 g net, 22K, EMI
  // pure 41.25 g, value ₹2,88,750, loan ₹2,16,562
  it('Test Case 1: 45g net, 22K, EMI plan matches expected values', () => {
    const netWeight = 45;
    const grossWeight = 45;
    const karat: KaratValue = 22;

    const pure = CalculationService.calculatePureGold(netWeight, karat);
    expect(pure).toBe(41.25);

    const value = CalculationService.calculateGoldValue(pure, 7000);
    expect(value).toBe(288750);

    const emiPlan = plans.find((p) => p.id === 'PLAN_EMI_01')!;
    const loan = CalculationService.calculateEligibleLoan(value, emiPlan.maxLtv);
    expect(loan).toBe(216562);
  });

  // Test Case 2: 45 g net, 22K, Bullet
  // value ₹2,88,750, loan ₹2,02,125 (70% LTV)
  it('Test Case 2: 45g net, 22K, Bullet plan matches expected values', () => {
    const netWeight = 45;
    const karat: KaratValue = 22;

    const pure = CalculationService.calculatePureGold(netWeight, karat);
    const value = CalculationService.calculateGoldValue(pure, 7000);
    expect(value).toBe(288750);

    const bulletPlan = plans.find((p) => p.id === 'PLAN_BULLET_01')!;
    const loan = CalculationService.calculateEligibleLoan(value, bulletPlan.maxLtv);
    expect(loan).toBe(202125);
  });

  // Test Case 3: 10 g net, 18K, EMI
  // pure 7.5 g, value ₹52,500, loan ₹39,375
  it('Test Case 3: 10g net, 18K, EMI plan matches expected values', () => {
    const netWeight = 10;
    const karat: KaratValue = 18;

    const pure = CalculationService.calculatePureGold(netWeight, karat);
    expect(pure).toBe(7.5);

    const value = CalculationService.calculateGoldValue(pure, 7000);
    expect(value).toBe(52500);

    const emiPlan = plans.find((p) => p.id === 'PLAN_EMI_01')!;
    const loan = CalculationService.calculateEligibleLoan(value, emiPlan.maxLtv);
    expect(loan).toBe(39375);
  });

  it('Strictly caps LTV at 0.75 even if plan configuration specifies higher', () => {
    const netWeight = 10;
    const karat: KaratValue = 24; // pure = 10g, value = 70000
    const pure = CalculationService.calculatePureGold(netWeight, karat);
    const value = CalculationService.calculateGoldValue(pure, 7000);

    // Plan with 85% LTV should be capped at 75%
    const loan = CalculationService.calculateEligibleLoan(value, 0.85);
    expect(loan).toBe(Math.floor(70000 * 0.75));
    expect(loan).toBe(52500);
  });

  it('Rounds eligible loan to whole rupee floor', () => {
    // 1 gram, 18K -> 0.75 pure -> ₹5,250 -> 70% LTV -> ₹3,675
    // 1.001 gram, 22K -> fractional rupee calculation
    const netWeight = 1.001;
    const pure = CalculationService.calculatePureGold(netWeight, 22);
    const value = CalculationService.calculateGoldValue(pure, 7000);
    const loan = CalculationService.calculateEligibleLoan(value, 0.75);

    expect(Number.isInteger(loan)).toBe(true);
    expect(loan).toBe(Math.floor(value * 0.75));
  });
});
