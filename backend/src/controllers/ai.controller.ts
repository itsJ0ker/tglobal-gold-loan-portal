import { Request, Response, NextFunction } from 'express';
import { AiLoanAgentService } from '../services/ai.service';

export class AiController {
  /**
   * POST /api/v1/chat
   * Chat endpoint for AI Loan Assistant with tool calling
   */
  static async handleChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { messages, pendingConfirmation } = req.body;
      const response = await AiLoanAgentService.processChat({
        messages: Array.isArray(messages) ? messages : [],
        pendingConfirmation,
      });

      return res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
