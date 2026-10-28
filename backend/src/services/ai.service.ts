import { SchemeService } from './scheme.service';
import { CalculationService, DEFAULT_MOCK_GOLD_RATE_24K } from './calculation.service';
import { LeadService } from './lead.service';
import { QuoteRequestSchema, LeadCreateSchema } from '../schemas/validation.schemas';
import { maskMobileNumber, sanitizeLog } from '../utils/mask';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCall?: {
    name: string;
    arguments: any;
  };
  toolResult?: any;
  requiresConfirmation?: boolean;
  confirmationPayload?: any;
}

export interface ChatRequest {
  messages: ChatMessage[];
  pendingConfirmation?: {
    action: 'submit_application';
    payload: any;
    confirmed: boolean;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  toolCallsExecuted?: Array<{
    name: string;
    args: any;
    result: any;
  }>;
  pendingConfirmation?: {
    summary: {
      customerName: string;
      mobileNumber: string;
      grossWeightGrams: number;
      netWeightGrams: number;
      karat: number;
      planId: string;
      planName: string;
      pureGoldGrams: number;
      goldValueRupees: number;
      eligibleLoanRupees: number;
    };
    payload: any;
  };
}

export class AiLoanAgentService {
  /**
   * System Prompt enforcing guardrails, tool calling discipline, and privacy
   */
  static readonly SYSTEM_PROMPT = `
You are the official Gold Loan Assistant for TGlobal Gold Loans.
Your sole purpose is to help customers understand loan schemes, calculate gold loan eligibility, and prepare loan applications.

CRITICAL GUARDRAILS & RULES:
1. STRICT TOPIC LIMIT: Only assist with gold loans. If the user asks about anything else (stocks, crypto, weather, cooking, personal advice, etc.), politely decline: "I am dedicated exclusively to assisting you with gold loan inquiries and applications. How can I help with your gold jewellery valuation today?"
2. NEVER INVENT FINANCIAL NUMBERS: You do not possess internal math abilities for financial quotes. ALL numbers, pure gold grams, gold values, and eligible loan amounts MUST come strictly from the calculate_quote tool.
3. NEVER PROMISE FINAL APPROVAL: Always clarify that quotes represent preliminary eligibility based on ₹7,000/g 24K gold rate, subject to physical assay verification in the branch.
4. PRIVACY: Never ask for or repeat unmasked PINs or OTPs. Mobile numbers are masked in logs.
5. EXPLICIT CONFIRMATION BEFORE SUBMISSION: Never call submit_application without explicit user confirmation of the complete application summary.
`.trim();

  /**
   * Tool 1: get_loan_schemes
   */
  static async toolGetLoanSchemes() {
    return await SchemeService.getActiveSchemes();
  }

  /**
   * Tool 2: calculate_quote
   */
  static async toolCalculateQuote(args: any) {
    // Validate tool arguments with the API Zod schema
    const validation = QuoteRequestSchema.safeParse(args);
    if (!validation.success) {
      const fieldErrors = validation.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return {
        status: 'error',
        error: 'Validation failed for quote calculation',
        fields: fieldErrors,
      };
    }

    const { netWeightGrams, grossWeightGrams, karat } = validation.data;
    const schemes = await SchemeService.getActiveSchemes();
    const quote = CalculationService.generateQuote(
      netWeightGrams,
      grossWeightGrams,
      karat,
      schemes,
      DEFAULT_MOCK_GOLD_RATE_24K
    );

    return {
      status: 'success',
      data: quote,
    };
  }

  /**
   * Tool 3: submit_application
   */
  static async toolSubmitApplication(payload: any) {
    // Validate tool arguments with the API Zod schema
    const validation = LeadCreateSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = validation.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return {
        status: 'error',
        error: 'Validation failed for application submission',
        fields: fieldErrors,
      };
    }

    try {
      const result = await LeadService.createLead(validation.data);
      return {
        status: 'success',
        data: result,
      };
    } catch (error: any) {
      return {
        status: 'error',
        statusCode: error.statusCode || 500,
        code: error.code || 'SUBMISSION_FAILED',
        message: error.message || 'Unable to submit application',
        applicationId: error.applicationId,
      };
    }
  }

  /**
   * Processes conversation with the AI Agent
   */
  static async processChat(chatRequest: ChatRequest): Promise<ChatResponse> {
    const messages = chatRequest.messages || [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';

    // Handle user confirmation of pending application
    if (chatRequest.pendingConfirmation) {
      const { payload, confirmed } = chatRequest.pendingConfirmation;
      if (confirmed) {
        const submissionResult = await this.toolSubmitApplication(payload);
        if (submissionResult.status === 'success' && submissionResult.data) {
          return {
            message: {
              role: 'assistant',
              content: `🎉 Congratulations ${payload.customerName}! Your gold loan application has been successfully submitted. Your Application ID is **${submissionResult.data.applicationId}**. Our branch representative will contact you shortly on ${maskMobileNumber(payload.mobileNumber)}.`,
              toolResult: submissionResult,
            },
            toolCallsExecuted: [
              {
                name: 'submit_application',
                args: payload,
                result: submissionResult,
              },
            ],
          };
        } else if (submissionResult.statusCode === 409) {
          return {
            message: {
              role: 'assistant',
              content: `⚠️ We noticed you already have an active application filed recently (${submissionResult.message}). As per lending policy, only one application is permitted within 7 days. Reference Application ID: **${submissionResult.applicationId}**.`,
              toolResult: submissionResult,
            },
            toolCallsExecuted: [
              {
                name: 'submit_application',
                args: payload,
                result: submissionResult,
              },
            ],
          };
        } else {
          return {
            message: {
              role: 'assistant',
              content: `We could not complete your submission due to an error: ${submissionResult.message}. Please review the details and try again.`,
              toolResult: submissionResult,
            },
          };
        }
      } else {
        return {
          message: {
            role: 'assistant',
            content: `No problem! I have cancelled the pending submission. Would you like to adjust the weight, karat, or explore another scheme?`,
          },
        };
      }
    }

    // 1. Guardrail Check: Off-Topic Filter
    if (this.isOffTopic(lastUserMessage)) {
      return {
        message: {
          role: 'assistant',
          content:
            'I am dedicated exclusively to assisting you with gold loan inquiries and applications. I cannot assist with general topics, investments, or other subjects. How can I help evaluate your gold jewellery today?',
        },
      };
    }

    // 2. Extract gold details if mentioned in conversation
    const parsedParams = this.extractDetailsFromConversation(messages);

    // 3. Check for invalid weight condition (net > gross)
    if (
      parsedParams.netWeightGrams !== undefined &&
      parsedParams.grossWeightGrams !== undefined &&
      parsedParams.netWeightGrams > parsedParams.grossWeightGrams
    ) {
      // Execute tool calculate_quote to get real backend validation error
      const toolResult = await this.toolCalculateQuote({
        netWeightGrams: parsedParams.netWeightGrams,
        grossWeightGrams: parsedParams.grossWeightGrams,
        karat: parsedParams.karat || 22,
      });

      return {
        message: {
          role: 'assistant',
          content: `Net gold weight (${parsedParams.netWeightGrams}g) cannot exceed gross weight (${parsedParams.grossWeightGrams}g). Gold jewellery net weight must be less than or equal to total gross weight. Please provide the corrected weights.`,
          toolResult,
        },
        toolCallsExecuted: [
          {
            name: 'calculate_quote',
            args: {
              netWeightGrams: parsedParams.netWeightGrams,
              grossWeightGrams: parsedParams.grossWeightGrams,
              karat: parsedParams.karat || 22,
            },
            result: toolResult,
          },
        ],
      };
    }

    // 4. Intent: User specifically asks about available schemes without providing weights
    if (parsedParams.netWeightGrams === undefined && this.isAskingAboutSchemes(lastUserMessage)) {
      const schemes = await this.toolGetLoanSchemes();
      const schemesText = schemes
        .map(
          (s) =>
            `• **${s.name}** (${s.id}): Interest rate ${s.annualInterestRate}% p.a., Max LTV ${s.maxLtv * 100}%, Tenure: ${s.description}`
        )
        .join('\n');

      return {
        message: {
          role: 'assistant',
          content: `Here are our verified gold loan schemes currently available:\n\n${schemesText}\n\nWould you like me to calculate your maximum eligible loan amount? Tell me the weight of your gold and karat (18K, 22K, or 24K).`,
          toolResult: schemes,
        },
        toolCallsExecuted: [
          {
            name: 'get_loan_schemes',
            args: {},
            result: schemes,
          },
        ],
      };
    }

    // 5. If user provided weights, calculate quote using Tool 2
    if (parsedParams.netWeightGrams !== undefined) {
      const karat = parsedParams.karat || 22;
      const gross = parsedParams.grossWeightGrams || parsedParams.netWeightGrams;

      const toolResult = await this.toolCalculateQuote({
        netWeightGrams: parsedParams.netWeightGrams,
        grossWeightGrams: gross,
        karat,
      });

      if (toolResult.status === 'success' && toolResult.data) {
        const quote = toolResult.data;
        const bulletPlan = quote.plans.find((p: any) => p.planId === 'PLAN_BULLET_01') || quote.plans[0];
        const emiPlan = quote.plans.find((p: any) => p.planId === 'PLAN_EMI_01') || quote.plans[0];

        // Check if user is also ready to apply and provided name & mobile
        const hasContact = parsedParams.customerName && parsedParams.mobileNumber;

        if (hasContact && parsedParams.customerName && parsedParams.mobileNumber) {
          const selectedPlan = parsedParams.planId || 'PLAN_EMI_01';
          const chosenPlanQuote = quote.plans.find((p: any) => p.planId === selectedPlan) || emiPlan;

          const submissionPayload = {
            customerName: parsedParams.customerName,
            mobileNumber: parsedParams.mobileNumber,
            grossWeightGrams: gross,
            netWeightGrams: parsedParams.netWeightGrams,
            karat,
            planId: chosenPlanQuote.planId,
          };

          return {
            message: {
              role: 'assistant',
              content: `Based on your ${parsedParams.netWeightGrams}g ${karat}K gold jewellery (market value ₹${quote.goldValueRupees.toLocaleString('en-IN')}), here is your application summary for the **${chosenPlanQuote.planName}** plan:\n\n` +
                `• Eligible Loan Amount: **₹${chosenPlanQuote.eligibleLoanRupees.toLocaleString('en-IN')}**\n` +
                `• Pure Gold: **${quote.pureGoldGrams}g**\n` +
                `• Applicant: **${parsedParams.customerName}**\n` +
                `• Mobile: **${maskMobileNumber(parsedParams.mobileNumber)}**\n\n` +
                `Please review and confirm below to submit your official application.`,
              requiresConfirmation: true,
              confirmationPayload: submissionPayload,
            },
            toolCallsExecuted: [
              {
                name: 'calculate_quote',
                args: { netWeightGrams: parsedParams.netWeightGrams, grossWeightGrams: gross, karat },
                result: toolResult,
              },
            ],
            pendingConfirmation: {
              summary: {
                customerName: parsedParams.customerName,
                mobileNumber: parsedParams.mobileNumber,
                grossWeightGrams: gross,
                netWeightGrams: parsedParams.netWeightGrams,
                karat,
                planId: chosenPlanQuote.planId,
                planName: chosenPlanQuote.planName,
                pureGoldGrams: quote.pureGoldGrams,
                goldValueRupees: quote.goldValueRupees,
                eligibleLoanRupees: chosenPlanQuote.eligibleLoanRupees,
              },
              payload: submissionPayload,
            },
          };
        }

        // Need missing contact fields or plan selection
        let responseText =
          `For **${parsedParams.netWeightGrams}g of ${karat}K gold**, pure gold weight is **${quote.pureGoldGrams}g**, with an estimated gold valuation of **₹${quote.goldValueRupees.toLocaleString('en-IN')}** (at ₹7,000/g 24K rate).\n\n` +
          `Eligible loan offers:\n` +
          `• **Monthly EMI Plan**: Up to **₹${emiPlan.eligibleLoanRupees.toLocaleString('en-IN')}** (75% LTV, 10.5% p.a., ~₹${emiPlan.monthlyEmiRupees?.toLocaleString('en-IN')}/mo)\n` +
          `• **Bullet Repayment**: Up to **₹${bulletPlan.eligibleLoanRupees.toLocaleString('en-IN')}** (70% LTV, 12% p.a.)\n\n`;

        if (!parsedParams.customerName && !parsedParams.mobileNumber) {
          responseText += `To proceed with your application, please provide your **Full Name** and **10-digit Mobile Number**.`;
        } else if (!parsedParams.customerName) {
          responseText += `Please provide your **Full Name** to complete the application.`;
        } else if (!parsedParams.mobileNumber) {
          responseText += `Please provide your **10-digit Indian Mobile Number** to proceed.`;
        }

        return {
          message: {
            role: 'assistant',
            content: responseText,
            toolResult: quote,
          },
          toolCallsExecuted: [
            {
              name: 'calculate_quote',
              args: { netWeightGrams: parsedParams.netWeightGrams, grossWeightGrams: gross, karat },
              result: toolResult,
            },
          ],
        };
      }
    }

    // Default: ask for weights and karat
    return {
      message: {
        role: 'assistant',
        content: `Welcome to TGlobal Gold Loans! I can help you find out your maximum loan eligibility instantly. How many grams of gold jewellery do you have, and what is its purity (18K, 22K, or 24K)?`,
      },
    };
  }

  /**
   * Identifies off-topic inquiries
   */
  private static isOffTopic(text: string): boolean {
    const lower = text.toLowerCase();
    const offTopicKeywords = [
      'weather',
      'recipe',
      'cook',
      'crypto',
      'bitcoin',
      'ethereum',
      'stock market',
      'movie',
      'sports',
      'cricket score',
      'football',
      'joke',
      'poem',
      'president',
      'politics',
      'travel advice',
      'ignore previous instructions',
      'jailbreak',
      'system prompt',
    ];

    return offTopicKeywords.some((keyword) => lower.includes(keyword));
  }

  /**
   * Checks if user is asking about loan schemes
   */
  private static isAskingAboutSchemes(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('scheme') ||
      lower.includes('plan') ||
      lower.includes('interest rate') ||
      lower.includes('options')
    );
  }

  /**
   * Extracts gold weights, karat, name, mobile, and selected plan from conversation history
   */
  private static extractDetailsFromConversation(messages: ChatMessage[]) {
    let netWeightGrams: number | undefined;
    let grossWeightGrams: number | undefined;
    let karat: 18 | 22 | 24 | undefined;
    let customerName: string | undefined;
    let mobileNumber: string | undefined;
    let planId: string | undefined;

    const fullText = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' ');

    // Extract net weight: e.g. "45 grams", "45g", "net weight 52"
    const netMatch = fullText.match(/(?:net(?: weight)?[:\s]*)?(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\b/i);
    if (netMatch) {
      netWeightGrams = parseFloat(netMatch[1]);
    }

    // Specific net vs gross pattern: e.g. "net 52 g and gross 50 g" or "gross 50g, net 52g"
    const netExplicit = fullText.match(/net\s*(?:weight)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*g?/i);
    const grossExplicit = fullText.match(/gross\s*(?:weight)?\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*g?/i);

    if (grossExplicit) {
      grossWeightGrams = parseFloat(grossExplicit[1]);
    }
    if (netExplicit) {
      netWeightGrams = parseFloat(netExplicit[1]);
    }

    // Extract Karat: 18, 22, 24
    if (/24\s*(?:k|carat|karat)/i.test(fullText)) {
      karat = 24;
    } else if (/22\s*(?:k|carat|karat)/i.test(fullText)) {
      karat = 22;
    } else if (/18\s*(?:k|carat|karat)/i.test(fullText)) {
      karat = 18;
    }

    // Extract 10-digit Indian mobile number
    const mobileMatch = fullText.match(/\b([6-9]\d{9})\b/);
    if (mobileMatch) {
      mobileNumber = mobileMatch[1];
    }

    // Extract plan
    if (/bullet/i.test(fullText)) {
      planId = 'PLAN_BULLET_01';
    } else if (/emi/i.test(fullText)) {
      planId = 'PLAN_EMI_01';
    }

    // Extract name: e.g. "My name is Priya Sharma" or "Name: Priya Sharma"
    const nameMatch = fullText.match(/(?:my name is|name[:\s]+|i am\s+)([A-Za-z\s]{2,40})/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (!/gold|gram|loan|bullet|emi|jewel/i.test(candidate)) {
        customerName = candidate;
      }
    }

    return {
      netWeightGrams,
      grossWeightGrams,
      karat,
      customerName,
      mobileNumber,
      planId,
    };
  }
}
