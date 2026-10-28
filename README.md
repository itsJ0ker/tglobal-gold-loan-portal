# TGlobal Gold Loan Intake Portal & AI Loan Assistant

> **Production-minded gold loan intake platform with deterministic financial arithmetic, verified backend tool-calling AI agent, and real-time operations ledger.** Built strictly according to the TGlobal Full-Stack & AI Assignment specification.

---

## 📋 Table of Contents
- [Quick Start from Scratch](#-quick-start-from-scratch)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Financial Calculation Specifications](#-financial-calculation-specifications)
- [API Endpoints & Error Contract](#-api-endpoints--error-contract)
- [AI Loan Assistant & 3 Tools](#-ai-loan-assistant--3-tools)
- [Automated AI Conversation Evaluations (npm run eval)](#-automated-ai-conversation-evaluations-npm-run-eval)
- [Admin Operations Ledger](#-admin-operations-ledger)
- [Bonus Features Implemented](#-bonus-features-implemented)
- [Automated Test Suite (npm test)](#-automated-test-suite-npm-test)
- [Remaining Limitations & Future Work](#-remaining-limitations--future-work)

---

## 🚀 Quick Start from Scratch

### 1. Prerequisites
- **Node.js**: `v20+` (Tested on `v24.19.0`)
- **npm**: `v10+` (Tested on `v11.17.0`)
- **PostgreSQL**: Local or hosted instance running on port `5432`

### 2. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd internship_project

# Install all root, backend, and frontend dependencies
npm install
```

### 3. Environment Variables Setup
Create `.env` inside `backend/` (or copy from root `.env.example`):
```bash
cp .env.example backend/.env
```
Ensure `backend/.env` contains your PostgreSQL credentials:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:1234@localhost:5432/gold_loan_portal?schema=public"
GOLD_RATE_24K_PER_GRAM=7000
ADMIN_API_KEY="admin_gold_secret_key_2026"
NODE_ENV=development
```

### 4. Database Setup & Seed
```bash
# Push schema and generate Prisma client
npm run prisma:migrate

# Seed standard loan schemes (PLAN_BULLET_01 and PLAN_EMI_01)
npm run seed
```

### 5. Run the Full Application
```bash
# Starts both Backend (port 5000) and Frontend (port 5173) concurrently
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🛠 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs backend API on `:5000` and Vite client on `:5173` concurrently |
| `npm test` | Runs the full Vitest suite (24 tests: calculations, API endpoints, concurrency, duplicates) |
| `npm run eval` | Executes the 6 automated AI conversation evaluations and prints formatted report |
| `npm run build` | Builds production bundles for both backend (`dist/`) and frontend (`dist/`) |
| `npm run seed` | Seeds / resets active loan schemes in PostgreSQL |

---

## 🏗 Architecture & Tech Stack

```
internship_project/
├── backend/
│   ├── prisma/             # Schema, migrations, seed script
│   ├── src/
│   │   ├── controllers/    # Route controllers (loan, AI, admin)
│   │   ├── services/       # CalculationService, LeadService, SchemeService, AiService
│   │   ├── schemas/        # Shared Zod validation schemas
│   │   ├── middleware/     # Error handling, rate limiting, admin auth
│   │   ├── types/          # TypeScript contracts
│   │   └── index.ts        # Server entrypoint
│   └── tests/              # Unit, integration, concurrency, & tool tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── calculator/ # Step 1 (Details), Step 2 (Live Quote), Step 3 (Confirm)
│   │   │   ├── chat/       # AI Loan Assistant drawer & inline confirmation
│   │   │   ├── admin/      # Admin ledger, filters, pagination, status workflow
│   │   │   └── layout/     # Editorial Header & gold rate banner
│   │   ├── services/       # API client with error normalization
│   │   └── App.tsx         # Main container with GSAP animations
├── AI_LOG.md               # Prompt logs, tools list, authentic AI bug analysis
└── ARCHITECTURE.md         # Detailed topology & concurrency documentation
```

- **Frontend**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS (curated Forest Green `#14382B`, Warm Ivory `#FBF9F5`, Charcoal `#161C18`, and Gold `#C29B38`)
- **Animation**: GSAP + ScrollTrigger (respects `prefers-reduced-motion`)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod (strictly synchronized between API and AI tools)
- **Testing**: Vitest + Supertest

---

## 📐 Financial Calculation Specifications

Calculations strictly follow the TGlobal specification based on a benchmark 24K rate of **₹7,000 / gram**:

$$\text{pureGoldGrams} = \text{netWeightGrams} \times \left(\frac{\text{karat}}{24}\right)$$

$$\text{goldValue} = \text{pureGoldGrams} \times 7000$$

$$\text{eligibleLoan} = \lfloor\text{goldValue} \times \min(\text{plan.maxLtv}, 0.75)\rfloor$$

### Deterministic Test Results Verified:
1. **45 g net, 22K, EMI**: pure gold `41.25 g`, gold value `₹2,88,750`, eligible loan `₹2,16,562` (HTTP 201).
2. **45 g net, 22K, Bullet**: gold value `₹2,88,750`, eligible loan `₹2,02,125` (70% LTV).
3. **10 g net, 18K, EMI**: pure gold `7.5 g`, gold value `₹52,500`, eligible loan `₹39,375`.
4. **Net 52 g > Gross 50 g**: HTTP 400 with field error on `netWeightGrams`.
5. **Invalid Mobile Numbers (`5876543210` or `98765`)**: HTTP 400 with field error on `mobileNumber`.
6. **Repeat application within 7 days**: HTTP 409 with existing `applicationId`.

---

## 🔌 API Endpoints & Error Contract

### 1. `GET /api/v1/loan-schemes`
Returns active schemes from PostgreSQL. Enforces maximum 75% LTV ceiling:
```json
{
  "data": [
    {
      "id": "PLAN_EMI_01",
      "name": "Monthly EMI",
      "annualInterestRate": 10.5,
      "maxLtv": 0.75,
      "tenureMonths": 12,
      "repaymentType": "EMI",
      "description": "12 months, equal monthly instalments"
    },
    {
      "id": "PLAN_BULLET_01",
      "name": "Bullet Repayment",
      "annualInterestRate": 12.0,
      "maxLtv": 0.70,
      "tenureMonths": 12,
      "repaymentType": "BULLET",
      "description": "12 months, interest + principal at maturity"
    }
  ]
}
```

### 2. `POST /api/v1/quotes`
Pure calculation without database write.
- **Request**: `{ "grossWeightGrams": 45, "netWeightGrams": 45, "karat": 22 }`
- **Response**:
```json
{
  "netWeightGrams": 45,
  "grossWeightGrams": 45,
  "karat": 22,
  "pureGoldGrams": 41.25,
  "goldRatePerGram": 7000,
  "goldValueRupees": 288750,
  "plans": [
    {
      "planId": "PLAN_EMI_01",
      "planName": "Monthly EMI",
      "annualInterestRate": 10.5,
      "maxLtv": 0.75,
      "eligibleLoanRupees": 216562,
      "monthlyEmiRupees": 19097
    },
    {
      "planId": "PLAN_BULLET_01",
      "planName": "Bullet Repayment",
      "annualInterestRate": 12.0,
      "maxLtv": 0.70,
      "eligibleLoanRupees": 202125
    }
  ]
}
```

### 3. `POST /api/v1/leads`
Validates input, recalculates values server-side, checks 7-day mobile duplication with transaction locks, and saves lead with status `SUBMITTED`.
- **Status**: `201 Created`
```json
{
  "applicationId": "GL-6478",
  "status": "SUBMITTED",
  "customerName": "Vikram Rathore",
  "maskedMobile": "9876XXXX10",
  "planId": "PLAN_EMI_01",
  "pureGoldGrams": 41.25,
  "goldValueRupees": 288750,
  "eligibleLoanRupees": 216562,
  "createdAt": "2026-10-28T14:02:11.890Z"
}
```

### 4. `GET /api/v1/leads` (Protected Admin View)
Header: `x-admin-key: admin_gold_secret_key_2026`
Returns leads newest first. Mobile numbers are always masked (`9876XXXX10`). Supports `?planId=...`, `?status=...`, `?page=1&limit=10`.

### Standardized Error Contract:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data. Please check the fields.",
    "fields": [
      {
        "field": "netWeightGrams",
        "message": "Net weight cannot exceed gross weight"
      }
    ]
  }
}
```

---

## 🤖 AI Loan Assistant & 3 Tools

The conversational assistant operates under strict guardrails and utilizes 3 backend tools:
1. `get_loan_schemes()`: Fetches schemes from PostgreSQL. Assistant describes only returned plans.
2. `calculate_quote(net, gross, karat)`: Calls backend quote service. The LLM never performs arithmetic.
3. `submit_application(payload)`: Submits application only after the borrower explicitly confirms the full summary card in the UI.

### Guardrails:
- Stays strictly on gold loans. Politely declines off-topic requests (crypto, stocks, cooking, weather).
- Makes zero promises of approval or investment advice.
- Tool arguments validated using identical Zod schemas as the API.
- Customer privacy: mobile numbers masked in console logs (`9876XXXX10`).

---

## 🧪 Automated AI Conversation Evaluations (`npm run eval`)

Run the automated evaluations:
```bash
npm run eval
```

Output:
```
===============================================================
  TGLOBAL GOLD LOAN PORTAL - AI AGENT EVALUATION SUITE
===============================================================
[✓ PASSED] 1. Happy Path: Question -> Live Quote -> Review Summary -> Confirmed Submission
[✓ PASSED] 2. Missing Information: Agent identifies missing contact fields and asks user
[✓ PASSED] 3. Weight Inversion: Net weight greater than gross rejected with corrective guidance
[✓ PASSED] 4. Duplicate Prevention: 7-day mobile duplication detected and explained
[✓ PASSED] 5. Off-Topic Guardrails: Non-loan query politely declined
[✓ PASSED] Bonus 6. Prompt Injection Defense: System prompt override rejected
Summary: 6/6 evaluations passed.
```

---

## 🏆 Bonus Features Implemented

1. **Idempotency-Key Support (Bonus 7)**:
   - Safe retries on `POST /leads` using `Idempotency-Key` header. Replays previous response without re-executing or creating duplicates.
2. **Atomic Concurrency Hardening (Bonus 8)**:
   - Uses PostgreSQL advisory transaction locks (`pg_advisory_xact_lock(hashtext('mobile_' || $1))`).
   - Two simultaneous parallel requests for the same mobile produce **exactly one 201 and one 409**.
3. **Application Status Workflow & Audit Log**:
   - Status transitions: `SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED`.
   - Immutable audit trail in `lead_status_audits` recording `fromStatus`, `toStatus`, `changedBy`, `reason`, and timestamp.
4. **AI Prompt Injection Defense**:
   - Resists adversarial jailbreaks and prompt override attempts.
5. **Tool-Status Visual Chips**:
   - Real-time indicator chips in the chat UI (`⚡ Executed tool: calculate_quote()`).
6. **Rate Limiting**:
   - Express rate limiter on `POST /leads` (30 requests/min per IP) to prevent spam.
7. **Comprehensive ARCHITECTURE.md**:
   - Topology, sequence diagrams, and mathematical breakdown.

---

## ⚠️ Remaining Limitations & Future Work

With additional development time:
1. **Live Assay Camera Integration**: Direct gold jewellery slip photo parsing via vision models to pre-fill gross and net weights.
2. **Lender Core Banking Integration**: Direct webhook sync into lender CBS (e.g. Finacle or Mambu) for instant in-branch token generation.
3. **Multi-lingual Voice Agent**: Expanding conversational intake to regional Indian languages (Hindi, Tamil, Telugu, Marathi) via WebSpeech API.
