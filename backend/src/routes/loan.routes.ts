import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { LoanController } from '../controllers/loan.controller';
import { AiController } from '../controllers/ai.controller';
import { requireAdminAuth } from '../middleware/auth.middleware';

export const loanRouter = Router();

// Rate limiter for lead submissions: max 30 requests per minute per IP
const leadSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many applications submitted from this IP. Please wait a minute before retrying.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Required Endpoints
loanRouter.get('/loan-schemes', LoanController.getLoanSchemes);
loanRouter.post('/quotes', LoanController.calculateQuote);
loanRouter.post('/leads', leadSubmissionLimiter, LoanController.createLead);
loanRouter.get('/leads', requireAdminAuth, LoanController.getLeads);

// Bonus Endpoints & AI
loanRouter.patch('/leads/:id/status', requireAdminAuth, LoanController.updateLeadStatus);
loanRouter.get('/leads/:id/audits', requireAdminAuth, LoanController.getLeadAudits);
loanRouter.get('/gold-rate', LoanController.getGoldRate);
loanRouter.post('/chat', AiController.handleChat);
