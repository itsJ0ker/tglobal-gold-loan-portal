import { Request, Response, NextFunction } from 'express';
import { SchemeService } from '../services/scheme.service';
import { CalculationService, DEFAULT_MOCK_GOLD_RATE_24K } from '../services/calculation.service';
import { LeadService } from '../services/lead.service';
import { QuoteRequestSchema, LeadCreateSchema } from '../schemas/validation.schemas';

export class LoanController {
  /**
   * GET /api/v1/loan-schemes
   * Returns active plans with id, name, annual interest rate, tenure, and max LTV (never above 75%).
   */
  static async getLoanSchemes(_req: Request, res: Response, next: NextFunction) {
    try {
      const schemes = await SchemeService.getActiveSchemes();
      return res.status(200).json({
        data: schemes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/quotes
   * Pure calculation with NO DB write. Returns pure gold, gold value, and eligible loan per plan.
   */
  static async calculateQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = QuoteRequestSchema.parse(req.body);
      const activePlans = await SchemeService.getActiveSchemes();

      const quote = CalculationService.generateQuote(
        validated.netWeightGrams,
        validated.grossWeightGrams,
        validated.karat,
        activePlans,
        DEFAULT_MOCK_GOLD_RATE_24K
      );

      return res.status(200).json(quote);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/leads
   * Validates input, recomputes quote server-side, de-duplicates, stores lead with status SUBMITTED,
   * returns HTTP 201 with applicationId.
   */
  static async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = LeadCreateSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || undefined;

      const result = await LeadService.createLead({
        ...validated,
        idempotencyKey,
      });

      // If replayed from idempotency key, return 200 or 201 (replaying original 201)
      const statusCode = result.replayed ? 200 : 201;
      return res.status(statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/leads
   * Returns all leads, newest first. Mobile numbers are always masked.
   * Supports plan filtering and pagination.
   */
  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = req.query.planId ? String(req.query.planId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await LeadService.getLeads({ planId, status, page, limit });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/leads/:id/status
   * Status workflow: SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED with audit log
   */
  static async updateLeadStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const changedBy = (req.headers['x-admin-user'] as string) || 'ADMIN';

      const result = await LeadService.updateLeadStatus(id, status, reason, changedBy);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/leads/:id/audits
   * Status audit history
   */
  static async getLeadAudits(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const audits = await LeadService.getLeadAudits(id);
      return res.status(200).json({ data: audits });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/gold-rate
   * Current mock 24K gold rate per gram
   */
  static async getGoldRate(_req: Request, res: Response) {
    return res.status(200).json({
      rate24kPerGram: DEFAULT_MOCK_GOLD_RATE_24K,
      unit: 'INR/gram',
      lastUpdated: new Date().toISOString(),
    });
  }
}
