import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AiLoanAgentService } from '../src/services/ai.service';
import { prisma } from '../src/services/db.service';
import { seed } from '../prisma/seed';

describe('AI Loan Assistant Tools & Guardrails Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Tool 1: get_loan_schemes returns active schemes with <= 75% max LTV', async () => {
    const schemes = await AiLoanAgentService.toolGetLoanSchemes();
    expect(schemes.length).toBeGreaterThanOrEqual(2);
    for (const s of schemes) {
      expect(s.maxLtv).toBeLessThanOrEqual(0.75);
    }
  });

  it('Tool 2: calculate_quote executes exact calculations and rejects net > gross', async () => {
    // Valid quote
    const valid = await AiLoanAgentService.toolCalculateQuote({
      grossWeightGrams: 45,
      netWeightGrams: 45,
      karat: 22,
    });
    expect(valid.status).toBe('success');
    expect(valid.data.pureGoldGrams).toBe(41.25);
    expect(valid.data.goldValueRupees).toBe(288750);

    // Invalid quote (net > gross)
    const invalid = await AiLoanAgentService.toolCalculateQuote({
      grossWeightGrams: 40,
      netWeightGrams: 45,
      karat: 22,
    });
    expect(invalid.status).toBe('error');
    expect(invalid.fields?.[0].field).toBe('netWeightGrams');
  });

  it('Tool 3: submit_application saves lead to database using same service layer', async () => {
    const testMobile = '9876555444';
    await prisma.lead.deleteMany({ where: { mobileNumber: testMobile } });

    const submission = await AiLoanAgentService.toolSubmitApplication({
      customerName: 'Priya Sharma',
      mobileNumber: testMobile,
      grossWeightGrams: 30,
      netWeightGrams: 30,
      karat: 22,
      planId: 'PLAN_EMI_01',
    });

    expect(submission.status).toBe('success');
    expect(submission.data.applicationId).toMatch(/^GL-\d+/);
    expect(submission.data.status).toBe('SUBMITTED');

    // Confirm record exists in DB
    const dbRecord = await prisma.lead.findUnique({
      where: { id: submission.data.applicationId },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.customerName).toBe('Priya Sharma');
  });

  it('Guardrail: Declines off-topic requests politely', async () => {
    const response = await AiLoanAgentService.processChat({
      messages: [
        { role: 'user', content: 'What is the recipe for biryani?' },
      ],
    });

    expect(response.message.content).toMatch(/dedicated exclusively to assisting you with gold loan/i);
    expect(response.toolCallsExecuted).toBeUndefined();
  });

  it('Requires explicit confirmation before submit_application is called', async () => {
    // User provides all details
    const response = await AiLoanAgentService.processChat({
      messages: [
        {
          role: 'user',
          content: 'My name is Rohan Sen, mobile 9876111222. I have 45 grams of 22 karat jewellery for EMI loan.',
        },
      ],
    });

    // Must not submit yet! Must prompt for confirmation
    expect(response.pendingConfirmation).toBeDefined();
    expect(response.message.requiresConfirmation).toBe(true);
    expect(response.toolCallsExecuted?.some((t) => t.name === 'submit_application')).toBe(false);

    // Now user confirms
    const confirmResponse = await AiLoanAgentService.processChat({
      messages: [],
      pendingConfirmation: {
        action: 'submit_application',
        payload: response.pendingConfirmation!.payload,
        confirmed: true,
      },
    });

    expect(confirmResponse.toolCallsExecuted?.some((t) => t.name === 'submit_application')).toBe(true);
    expect(confirmResponse.message.content).toMatch(/Application ID/i);
  });
});
