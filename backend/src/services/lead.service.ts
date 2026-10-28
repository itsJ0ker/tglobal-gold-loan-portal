import { prisma } from './db.service';
import { CalculationService, DEFAULT_MOCK_GOLD_RATE_24K } from './calculation.service';
import { SchemeService } from './scheme.service';
import { maskMobileNumber } from '../utils/mask';
import { KaratValue } from '../types';

export class AppError extends Error {
  statusCode: number;
  code: string;
  fields?: Array<{ field: string; message: string }>;
  applicationId?: string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Array<{ field: string; message: string }>,
    applicationId?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.applicationId = applicationId;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export interface CreateLeadParams {
  customerName: string;
  mobileNumber: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: KaratValue;
  planId: string;
  idempotencyKey?: string;
}

export interface GetLeadsQuery {
  planId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class LeadService {
  /**
   * Generates a unique, professional application ID in the format GL-XXXX
   */
  private static async generateApplicationId(): Promise<string> {
    const count = await prisma.lead.count();
    const sequence = 1000 + count + 1;
    let candidate = `GL-${sequence}`;

    // Ensure uniqueness
    let exists = await prisma.lead.findUnique({ where: { id: candidate } });
    let attempt = 0;
    while (exists && attempt < 50) {
      attempt++;
      candidate = `GL-${sequence + attempt + Math.floor(Math.random() * 100)}`;
      exists = await prisma.lead.findUnique({ where: { id: candidate } });
    }
    return candidate;
  }

  /**
   * Creates a new gold loan application (lead).
   * - Validates plan existence (throws 404 if unknown)
   * - Re-calculates pure gold, gold value, and eligible loan server-side
   * - Prevents duplicate applications for the same mobile within 7 days (throws 409)
   * - Atomic concurrency lock per mobile prevents race conditions
   * - Supports Idempotency-Key header for safe retries
   */
  static async createLead(params: CreateLeadParams) {
    const {
      customerName,
      mobileNumber,
      grossWeightGrams,
      netWeightGrams,
      karat,
      planId,
      idempotencyKey,
    } = params;

    // Check Idempotency-Key if provided
    if (idempotencyKey && idempotencyKey.trim().length > 0) {
      const existingKeyLead = await prisma.lead.findUnique({
        where: { idempotencyKey: idempotencyKey.trim() },
        include: { plan: true },
      });
      if (existingKeyLead) {
        return {
          replayed: true,
          applicationId: existingKeyLead.id,
          status: existingKeyLead.status,
          customerName: existingKeyLead.customerName,
          maskedMobile: maskMobileNumber(existingKeyLead.mobileNumber),
          planId: existingKeyLead.planId,
          planName: existingKeyLead.plan.name,
          netWeightGrams: Number(existingKeyLead.netWeightGrams),
          grossWeightGrams: Number(existingKeyLead.grossWeightGrams),
          karat: existingKeyLead.karat,
          pureGoldGrams: Number(existingKeyLead.pureGoldGrams),
          goldRatePerGram: Number(existingKeyLead.goldRatePerGram),
          goldValueRupees: Number(existingKeyLead.goldValueRupees),
          eligibleLoanRupees: Number(existingKeyLead.eligibleLoanRupees),
          createdAt: existingKeyLead.createdAt.toISOString(),
        };
      }
    }

    // Verify loan scheme exists
    const plan = await SchemeService.getSchemeById(planId);
    if (!plan) {
      throw new AppError(404, 'PLAN_NOT_FOUND', `Loan plan with id '${planId}' does not exist.`);
    }

    // Server-side calculation of financial figures
    const goldRate = DEFAULT_MOCK_GOLD_RATE_24K;
    const pureGoldGrams = CalculationService.calculatePureGold(netWeightGrams, karat);
    const goldValueRupees = CalculationService.calculateGoldValue(pureGoldGrams, goldRate);
    const eligibleLoanRupees = CalculationService.calculateEligibleLoan(goldValueRupees, plan.maxLtv);

    // Concurrency hardening using PostgreSQL transaction and advisory lock
    return await prisma.$transaction(async (tx) => {
      // Use PostgreSQL advisory transaction lock on hashed mobile number
      // This serializes parallel requests for the same mobile without blocking unrelated requests
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        `mobile_${mobileNumber}`
      );

      // Check for duplicate application within 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentApplication = await tx.lead.findFirst({
        where: {
          mobileNumber,
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentApplication) {
        const formattedDate = new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'short',
        }).format(recentApplication.createdAt);

        throw new AppError(
          409,
          'DUPLICATE_APPLICATION',
          `You already applied on ${formattedDate}, application ${recentApplication.id}`,
          undefined,
          recentApplication.id
        );
      }

      // Generate unique application ID (e.g. GL-1042)
      let applicationId = `GL-${Math.floor(1000 + Math.random() * 9000)}`;
      let exists = await tx.lead.findUnique({ where: { id: applicationId } });
      let attempt = 0;
      while (exists && attempt < 50) {
        attempt++;
        applicationId = `GL-${Math.floor(1000 + Math.random() * 9000)}`;
        exists = await tx.lead.findUnique({ where: { id: applicationId } });
      }
      if (exists) {
        applicationId = `GL-${Date.now().toString().slice(-6)}`;
      }

      const newLead = await tx.lead.create({
        data: {
          id: applicationId,
          customerName,
          mobileNumber,
          grossWeightGrams,
          netWeightGrams,
          karat,
          planId,
          pureGoldGrams,
          goldRatePerGram: goldRate,
          goldValueRupees,
          eligibleLoanRupees,
          status: 'SUBMITTED',
          idempotencyKey: idempotencyKey ? idempotencyKey.trim() : null,
        },
        include: {
          plan: true,
        },
      });

      // Record initial audit entry
      await tx.leadStatusAudit.create({
        data: {
          leadId: newLead.id,
          fromStatus: 'NONE',
          toStatus: 'SUBMITTED',
          changedBy: 'CUSTOMER_PORTAL',
          reason: 'Application submitted by customer',
        },
      });

      return {
        replayed: false,
        applicationId: newLead.id,
        status: newLead.status,
        customerName: newLead.customerName,
        maskedMobile: maskMobileNumber(newLead.mobileNumber),
        planId: newLead.planId,
        planName: newLead.plan.name,
        netWeightGrams: Number(newLead.netWeightGrams),
        grossWeightGrams: Number(newLead.grossWeightGrams),
        karat: newLead.karat,
        pureGoldGrams: Number(newLead.pureGoldGrams),
        goldRatePerGram: Number(newLead.goldRatePerGram),
        goldValueRupees: Number(newLead.goldValueRupees),
        eligibleLoanRupees: Number(newLead.eligibleLoanRupees),
        createdAt: newLead.createdAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves leads with masked mobile numbers, filtering, and optional pagination
   */
  static async getLeads(query: GetLeadsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.planId && query.planId.trim()) {
      where.planId = query.planId.trim();
    }
    if (query.status && query.status.trim()) {
      where.status = query.status.trim();
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { plan: true },
      }),
    ]);

    return {
      data: leads.map((lead) => ({
        applicationId: lead.id,
        status: lead.status,
        customerName: lead.customerName,
        maskedMobile: maskMobileNumber(lead.mobileNumber),
        netWeightGrams: Number(lead.netWeightGrams),
        grossWeightGrams: Number(lead.grossWeightGrams),
        karat: lead.karat,
        planId: lead.planId,
        planName: lead.plan.name,
        pureGoldGrams: Number(lead.pureGoldGrams),
        goldValueRupees: Number(lead.goldValueRupees),
        eligibleLoanRupees: Number(lead.eligibleLoanRupees),
        createdAt: lead.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates lead status with audit logging (Bonus workflow)
   */
  static async updateLeadStatus(id: string, newStatus: string, reason?: string, changedBy: string = 'ADMIN') {
    const allowed = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
    if (!allowed.includes(newStatus)) {
      throw new AppError(400, 'INVALID_STATUS', `Status must be one of: ${allowed.join(', ')}`);
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, 'LEAD_NOT_FOUND', `Application ${id} not found.`);
      }

      const updated = await tx.lead.update({
        where: { id },
        data: { status: newStatus },
        include: { plan: true },
      });

      await tx.leadStatusAudit.create({
        data: {
          leadId: id,
          fromStatus: existing.status,
          toStatus: newStatus,
          changedBy,
          reason,
        },
      });

      return {
        applicationId: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Fetches status audit history for a lead
   */
  static async getLeadAudits(leadId: string) {
    return await prisma.leadStatusAudit.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
