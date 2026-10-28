import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/db.service';
import { seed } from '../prisma/seed';

const ADMIN_HEADER = { 'x-admin-key': 'admin_gold_secret_key_2026' };

describe('API Integration Tests & Core Assignment Test Cases', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/loan-schemes', () => {
    it('returns active loan schemes from DB with max LTV capped at 75%', async () => {
      const res = await request(app).get('/api/v1/loan-schemes');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      for (const scheme of res.body.data) {
        expect(scheme.maxLtv).toBeLessThanOrEqual(0.75);
        expect(scheme).toHaveProperty('id');
        expect(scheme).toHaveProperty('name');
        expect(scheme).toHaveProperty('annualInterestRate');
        expect(scheme).toHaveProperty('tenureMonths');
      }
    });
  });

  describe('POST /api/v1/quotes', () => {
    // Test Case 1: 45 g net, 22K, EMI
    it('Test Case 1 & 2: 45g net, 22K calculates exact pure gold, gold value, and loans for EMI and Bullet', async () => {
      const res = await request(app).post('/api/v1/quotes').send({
        grossWeightGrams: 45,
        netWeightGrams: 45,
        karat: 22,
      });

      expect(res.status).toBe(200);
      expect(res.body.pureGoldGrams).toBe(41.25);
      expect(res.body.goldValueRupees).toBe(288750);

      const emiPlan = res.body.plans.find((p: any) => p.planId === 'PLAN_EMI_01');
      expect(emiPlan).toBeDefined();
      expect(emiPlan.eligibleLoanRupees).toBe(216562);

      const bulletPlan = res.body.plans.find((p: any) => p.planId === 'PLAN_BULLET_01');
      expect(bulletPlan).toBeDefined();
      expect(bulletPlan.eligibleLoanRupees).toBe(202125);
    });

    // Test Case 3: 10 g net, 18K, EMI
    it('Test Case 3: 10g net, 18K, EMI calculates pure 7.5g, value ₹52,500, loan ₹39,375', async () => {
      const res = await request(app).post('/api/v1/quotes').send({
        grossWeightGrams: 10,
        netWeightGrams: 10,
        karat: 18,
      });

      expect(res.status).toBe(200);
      expect(res.body.pureGoldGrams).toBe(7.5);
      expect(res.body.goldValueRupees).toBe(52500);

      const emiPlan = res.body.plans.find((p: any) => p.planId === 'PLAN_EMI_01');
      expect(emiPlan.eligibleLoanRupees).toBe(39375);
    });

    // Test Case 4: net 52 g > gross 50 g
    it('Test Case 4: net 52g > gross 50g returns HTTP 400 with field error on netWeightGrams', async () => {
      const res = await request(app).post('/api/v1/quotes').send({
        grossWeightGrams: 50,
        netWeightGrams: 52,
        karat: 22,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      const fieldError = res.body.error.fields.find((f: any) => f.field === 'netWeightGrams');
      expect(fieldError).toBeDefined();
      expect(fieldError.message).toMatch(/exceed/i);
    });
  });

  describe('POST /api/v1/leads', () => {
    // Test Case 5: Invalid mobile numbers (5876543210 or 98765)
    it('Test Case 5: Invalid mobile number 5876543210 returns HTTP 400 with field error on mobileNumber', async () => {
      const res = await request(app).post('/api/v1/leads').send({
        customerName: 'Rahul Verma',
        mobileNumber: '5876543210',
        grossWeightGrams: 45,
        netWeightGrams: 45,
        karat: 22,
        planId: 'PLAN_EMI_01',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const mobileError = res.body.error.fields.find((f: any) => f.field === 'mobileNumber');
      expect(mobileError).toBeDefined();
    });

    it('Test Case 5b: Short mobile number 98765 returns HTTP 400 with field error on mobileNumber', async () => {
      const res = await request(app).post('/api/v1/leads').send({
        customerName: 'Rahul Verma',
        mobileNumber: '98765',
        grossWeightGrams: 45,
        netWeightGrams: 45,
        karat: 22,
        planId: 'PLAN_EMI_01',
      });

      expect(res.status).toBe(400);
      const mobileError = res.body.error.fields.find((f: any) => f.field === 'mobileNumber');
      expect(mobileError).toBeDefined();
    });

    it('Returns HTTP 404 if planId does not exist', async () => {
      const res = await request(app).post('/api/v1/leads').send({
        customerName: 'Aarav Patel',
        mobileNumber: '9876543211',
        grossWeightGrams: 30,
        netWeightGrams: 30,
        karat: 22,
        planId: 'NON_EXISTENT_PLAN_999',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PLAN_NOT_FOUND');
    });

    // Test Case 1 full submission: 45g, 22K, EMI -> 201
    it('Test Case 1 Submission: 45g net, 22K, EMI returns HTTP 201 with applicationId and recomputed loan', async () => {
      const uniqueMobile = '9876123456';
      // Clean up previous runs if any
      await prisma.lead.deleteMany({ where: { mobileNumber: uniqueMobile } });

      const res = await request(app).post('/api/v1/leads').send({
        customerName: 'Deepak Kumar',
        mobileNumber: uniqueMobile,
        grossWeightGrams: 45,
        netWeightGrams: 45,
        karat: 22,
        planId: 'PLAN_EMI_01',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('applicationId');
      expect(res.body.applicationId).toMatch(/^GL-\d+/);
      expect(res.body.status).toBe('SUBMITTED');
      expect(res.body.pureGoldGrams).toBe(41.25);
      expect(res.body.goldValueRupees).toBe(288750);
      expect(res.body.eligibleLoanRupees).toBe(216562);
      expect(res.body.maskedMobile).toBe('9876XXXX56');
    });

    // Test Case 6: Same mobile again within 7 days -> 409
    it('Test Case 6: Repeated application from same mobile within 7 days returns HTTP 409 with existing applicationId', async () => {
      const mobile = '9876123456';

      const res = await request(app).post('/api/v1/leads').send({
        customerName: 'Deepak Kumar',
        mobileNumber: mobile,
        grossWeightGrams: 45,
        netWeightGrams: 45,
        karat: 22,
        planId: 'PLAN_BULLET_01',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_APPLICATION');
      expect(res.body.error).toHaveProperty('applicationId');
      expect(res.body.error.message).toMatch(/already applied/i);
    });

    // Bonus 7: Same request, same Idempotency-Key -> 200/201 replayed
    it('Bonus 7: Same request with same Idempotency-Key returns original replayed response', async () => {
      const uniqueMobile = '9876999111';
      await prisma.lead.deleteMany({ where: { mobileNumber: uniqueMobile } });

      const idempotencyKey = `idem-key-${Date.now()}`;

      // First call
      const res1 = await request(app)
        .post('/api/v1/leads')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          customerName: 'Ananya Roy',
          mobileNumber: uniqueMobile,
          grossWeightGrams: 20,
          netWeightGrams: 20,
          karat: 24,
          planId: 'PLAN_EMI_01',
        });

      expect(res1.status).toBe(201);
      const app1 = res1.body.applicationId;

      // Second call with identical Idempotency-Key
      const res2 = await request(app)
        .post('/api/v1/leads')
        .set('Idempotency-Key', idempotencyKey)
        .send({
          customerName: 'Ananya Roy',
          mobileNumber: uniqueMobile,
          grossWeightGrams: 20,
          netWeightGrams: 20,
          karat: 24,
          planId: 'PLAN_EMI_01',
        });

      expect([200, 201]).toContain(res2.status);
      expect(res2.body.applicationId).toBe(app1);
      expect(res2.body.replayed).toBe(true);
    });

    // Bonus 8: 2 parallel requests, same new mobile -> Exactly one 201 and one 409
    it('Bonus 8: Two parallel requests with same new mobile produce exactly one 201 and one 409', async () => {
      const parallelMobile = '9876888222';
      await prisma.lead.deleteMany({ where: { mobileNumber: parallelMobile } });

      const payload = {
        customerName: 'Vikram Singh',
        mobileNumber: parallelMobile,
        grossWeightGrams: 25,
        netWeightGrams: 25,
        karat: 22,
        planId: 'PLAN_BULLET_01',
      };

      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/leads').send(payload),
        request(app).post('/api/v1/leads').send(payload),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });
  });

  describe('GET /api/v1/leads (Admin & Masking)', () => {
    it('Requires admin authentication', async () => {
      const res = await request(app).get('/api/v1/leads');
      expect(res.status).toBe(401);
    });

    it('Returns leads newest first with masked mobile numbers', async () => {
      const res = await request(app).get('/api/v1/leads').set(ADMIN_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);

      const firstLead = res.body.data[0];
      expect(firstLead).toHaveProperty('applicationId');
      expect(firstLead).toHaveProperty('maskedMobile');
      expect(firstLead.maskedMobile).toMatch(/^\d{4}XXXX\d{2}$/);
      expect(firstLead).not.toHaveProperty('mobileNumber'); // Plain mobile never exposed
    });

    it('Filters leads by planId', async () => {
      const res = await request(app)
        .get('/api/v1/leads?planId=PLAN_EMI_01')
        .set(ADMIN_HEADER);

      expect(res.status).toBe(200);
      for (const lead of res.body.data) {
        expect(lead.planId).toBe('PLAN_EMI_01');
      }
    });
  });
});
