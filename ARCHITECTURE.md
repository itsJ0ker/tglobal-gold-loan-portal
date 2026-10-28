# Architecture Overview: TGlobal Gold Loan Portal

## 1. System Topology

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  +-----------------------------------+     +-----------------------------------+  |
|  |     Customer Portal (React 19)    |     |    Admin Dashboard (React 19)     |  |
|  |   - 3-Step Guided Intake Flow     |     |  - Protected Operations Ledger    |  |
|  |   - Debounced Live Quotes (~300ms)|     |  - Mobile Number Masking          |  |
|  |   - GSAP Restrained Animations    |     |  - Status Workflow & Audit Log    |  |
|  +-----------------+-----------------+     +-----------------+-----------------+  |
|                    |                                         |                    |
|                    +--------------------+--------------------+                    |
|                                         |                                         |
|                    +--------------------+--------------------+                    |
|                    |      AI Loan Assistant (Chat Drawer)    |                    |
|                    |   - Natural Language Consultation       |                    |
|                    |   - Tool-Calling (Zero Math by Model)   |                    |
|                    |   - Explicit In-Thread UI Confirmation  |                    |
|                    +--------------------+--------------------+                    |
+-----------------------------------------|-----------------------------------------+
                                          | HTTP (REST JSON)
                                          v
+-----------------------------------------------------------------------------------+
|                              BACKEND TIER (Express + TS)                          |
|                                                                                   |
|  [Rate Limiter] -> [Admin Auth Guard] -> [Central Error Handler]                  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                          ZOD VALIDATION LAYER                               |  |
|  |  - QuoteRequestSchema (0 < net <= gross <= 1000g, karat 18|22|24)          |  |
|  |  - LeadCreateSchema (Name 2-60 letters/spaces, Indian mobile ^[6-9]\d{9}$)  |  |
|  +--------------------------------------+--------------------------------------+  |
|                                         |                                         |
|  +--------------------------------------+--------------------------------------+  |
|  |                         UNIFIED SERVICE LAYER                               |  |
|  |                                                                             |  |
|  |   CalculationService                     LeadService                        |  |
|  |   - pureGold = net * (karat/24)          - Duplicate 7-day mobile check     |  |
|  |   - goldVal = pure * rate24k             - Idempotency-Key lookup & replay  |  |
|  |   - loan = floor(val * min(LTV, 0.75))   - Advisory transaction lock        |  |
|  |                                          - Status lifecycle & audit log     |  |
|  |                                                                             |  |
|  |   SchemeService                          AiLoanAgentService                 |  |
|  |   - Active plans from DB                 - Tool 1: get_loan_schemes()       |  |
|  |   - Strict 75% LTV cap enforcement       - Tool 2: calculate_quote()        |  |
|  |                                          - Tool 3: submit_application()     |  |
|  +--------------------------------------+--------------------------------------+  |
|                                         |                                         |
|  +--------------------------------------+--------------------------------------+  |
|  |                          PRISMA ORM ENGINE                                  |  |
|  +--------------------------------------+--------------------------------------+  |
+-----------------------------------------|-----------------------------------------+
                                          | SQL / TCP
                                          v
+-----------------------------------------------------------------------------------+
|                              DATABASE TIER (PostgreSQL)                           |
|                                                                                   |
|   Tables:                                                                         |
|   - loan_schemes (id, name, annualInterestRate, maxLtv, tenureMonths, etc.)       |
|   - leads (id, customerName, mobileNumber, net/gross, karat, pureGold, status)   |
|   - lead_status_audits (id, leadId, fromStatus, toStatus, changedBy, reason)      |
|                                                                                   |
|   Concurrency Hardening:                                                          |
|   - pg_advisory_xact_lock(hashtext('mobile_' || mobileNumber))                    |
|   - Unique index on idempotencyKey                                                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Principles

### 1. Single Source of Truth
Both the **Customer Intake Form** and the **AI Loan Assistant** run on the exact same backend service layer:
- Calculation logic is exclusively housed in `CalculationService.ts`.
- The LLM never performs internal financial arithmetic. All numbers (pure gold, market value, loan amounts) originate from `POST /api/v1/quotes`.
- Submissions from both paths validate against the identical Zod schemas and store records in the same `leads` table.

### 2. Deterministic Money Mathematics
All financial amounts are stored and calculated with strict precision:
- `pureGoldGrams = Math.round((netWeightGrams * karat / 24) * 1000) / 1000` (3 decimal places).
- `goldValueRupees = Math.round(pureGoldGrams * 7000 * 100) / 100` (2 decimal places).
- `eligibleLoanRupees = Math.floor(goldValueRupees * Math.min(plan.maxLtv, 0.75))` (strictly floored whole rupees, never above 75% LTV).

### 3. Concurrency & De-Duplication Architecture
To satisfy the requirements of preventing duplicate submissions within 7 days—even under simultaneous parallel requests:
- Each submission executes within an atomic Prisma transaction (`prisma.$transaction`).
- Before checking the 7-day window, the transaction acquires a PostgreSQL advisory lock on the hashed mobile number:
  ```sql
  SELECT pg_advisory_xact_lock(hashtext('mobile_' || $mobileNumber));
  ```
- If two parallel requests arrive for the same mobile, one acquires the lock, completes the insert, and releases the lock on commit. The second request immediately detects the newly committed record and returns **HTTP 409 Conflict**.
- If an `Idempotency-Key` header is present, the server replays the original response without re-executing business logic.

### 4. Privacy & Masking Discipline
- Indian mobile numbers are masked in API responses: `9876XXXX10`.
- Console logs are passed through `sanitizeLog()` to scrub any 10-digit phone patterns.
- Raw mobile numbers are never returned in public or admin API listings.
