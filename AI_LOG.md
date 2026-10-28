# AI Assistance Log (AI_LOG.md)

This log documents the usage of AI coding tools during the development of the **TGlobal Production-Minded Gold Loan Intake Portal & AI Loan Assistant**, adhering strictly to the assignment deliverables.

---

## 1. AI Tools Used & Purpose

| AI Tool / Assistant | Purpose & Scope |
| :--- | :--- |
| **Antigravity AI (Gemini 3.8 Flash)** | Core pair programming, architecture design, TypeScript typing, Zod schema generation, and full-stack component structuring. |
| **Playwright / Browser Subagent** | Automated end-to-end browser verification, UI interaction testing, mobile viewport verification (375px), and recording generation. |
| **Vitest & Supertest Runner** | Deterministic unit and API integration test execution, verification of edge cases and concurrency locks. |

---

## 2. Two Exact Prompts Used

### Prompt 1: Validation Schema & Edge Cases
```text
Write a robust Zod validation schema for gold loan quotes and lead submissions according to these exact business rules:
- customerName: 2 to 60 characters, letters and spaces only.
- mobileNumber: 10-digit Indian mobile number matching ^[6-9]\d{9}$.
- grossWeightGrams & netWeightGrams: 0 < netWeightGrams <= grossWeightGrams <= 1000g.
- karat: must be strictly one of [18, 22, 24].
- If netWeightGrams > grossWeightGrams, the refinement must explicitly attach the error to the 'netWeightGrams' path so the API error field specifically targets netWeightGrams.
- Ensure the error contract returns { error: { code, message, fields: [{ field, message }] } } and HTTP 400 for validation errors.
```

### Prompt 2: AI Agent Tools & Guardrails
```text
Implement an AI Loan Assistant service with tool calling for a gold loan portal. It must provide three typed backend tools:
1. get_loan_schemes(): returns active plans from the database with max LTV strictly capped at 75%.
2. calculate_quote(net, gross, karat): invokes the pure calculation service. The LLM must NEVER do arithmetic itself. All numbers must come from this tool.
3. submit_application(payload): submits the application to the database, but ONLY after the borrower has explicitly confirmed the full summary in the UI.

In addition:
- Enforce strict guardrails: politely decline off-topic queries (crypto, weather, recipes, investment advice).
- Never promise final loan approval (preliminary eligibility only).
- When a tool call is invalid (e.g. net weight > gross weight), pass the Zod validation error back to the model so it can conversationally guide the user to correct the input.
- Mask all mobile numbers in console logs (9876XXXX10) to preserve customer privacy.
```

---

## 3. Genuine Example of Incorrect AI-Generated Code

### The Mistake
During the initial implementation of the financial calculation service, the AI tool suggested computing `pureGoldGrams` and `eligibleLoan` as follows:

```typescript
// INITIALLY SUGGESTED (INCORRECT):
export function calculateEligibleLoan(netWeight: number, karat: number, rate: number, ltv: number) {
  const pureGrams = Number(((netWeight * karat) / 24).toFixed(2)); // Rounding too early!
  const goldValue = pureGrams * rate;
  const loan = goldValue * ltv; // Produced float rupees: e.g. 216562.5
  return loan;
}
```

### Why It Was Wrong & How It Was Detected
1. **Premature Rounding of Pure Gold**: Rounding `pureGrams` to 2 decimal places caused loss of precision on fractional gram measurements (e.g. 15.333g or jewellery alloys).
2. **Floating-Point Rupee Calculation**: For Test Case 1 (45g net, 22K, EMI with 75% LTV):
   - Gold value = ₹2,88,750
   - `288,750 * 0.75 = 216,562.5`
   - The AI returned `216562.5` as a floating-point number.
   - However, the assignment explicitly specifies:
     > *"Loan is in whole rupees and never above 75% LTV. Store money as integer paise or DECIMAL, never as float rupees."*
     > *Expected for Test Case 1: eligible loan ₹2,16,562.*
   - Without `Math.floor()`, the loan was rounded up or remained a decimal, violating the strict 75% LTV ceiling and failing the deterministic check.

### The Automated Test That Catches It
We implemented an explicit unit test in `backend/tests/calculations.test.ts` to ensure that loan values are strictly integer whole rupees floored at the LTV ceiling:

```typescript
// backend/tests/calculations.test.ts
it('Test Case 1: 45g net, 22K, EMI plan matches expected values and floors to whole rupees', () => {
  const pure = CalculationService.calculatePureGold(45, 22);
  expect(pure).toBe(41.25);

  const value = CalculationService.calculateGoldValue(pure, 7000);
  expect(value).toBe(288750);

  const emiPlan = plans.find((p) => p.id === 'PLAN_EMI_01')!;
  const loan = CalculationService.calculateEligibleLoan(value, emiPlan.maxLtv);
  
  // Catches float rupees and unfloored values:
  expect(Number.isInteger(loan)).toBe(true);
  expect(loan).toBe(216562); // Not 216562.5 or 216563
});
```

### The Corrected Implementation
```typescript
// CORRECTED CODE:
export class CalculationService {
  static calculatePureGold(netWeightGrams: number, karat: KaratValue): number {
    const rawPure = (netWeightGrams * karat) / 24;
    return Math.round(rawPure * 1000) / 1000; // 3 decimal precision
  }

  static calculateGoldValue(pureGoldGrams: number, rate24kPerGram: number = 7000): number {
    return Math.round(pureGoldGrams * rate24kPerGram * 100) / 100;
  }

  static calculateEligibleLoan(goldValueRupees: number, planMaxLtv: number): number {
    const effectiveLtv = Math.min(planMaxLtv, 0.75); // Never exceed 75%
    return Math.floor(goldValueRupees * effectiveLtv); // Whole rupee floor
  }
}
```
