# CRM Hardening — Design Spec

## Context

Domotai Technologies is about to start operating with the CRM in production. The commercial team (5 salesmen/freelancers) will use it daily to manage leads, track tasks, send invoices, and coordinate with clients. This spec addresses 3 categories of issues found during a comprehensive audit: operational gaps that affect day-to-day usage, productivity features needed for a sales team, and robustness improvements for long-term reliability.

Single-tenant setup (Domotai only, no multi-tenant planned). Notifications via in-app + email. Reports via CSV export + weekly email digest.

---

## Wave 1 — Day 1 Operations

### 1.1 Frontend Error Handling

**Problem:** Multiple pages use `useQuery()` without handling error states. When an API call fails, users see infinite loading spinners with no feedback.

**Fix:**
- Pages affected: Dashboard, Calendar, Invoices, TimeTracking, Capacity, Incidents
- Add `isError`/`error` destructuring from useQuery and render error state with message + retry button
- Update axios interceptor in `src/lib/api-client.ts` to handle 403, 5xx, and network timeouts with user-facing toasts

**Files:**
- `domotaicrmVer2/src/lib/api-client.ts` — add 403/5xx/timeout handling
- `domotaicrmVer2/src/pages/Calendar.tsx` — add error state
- `domotaicrmVer2/src/pages/Invoices.tsx` — add error state
- `domotaicrmVer2/src/pages/TimeTracking.tsx` — add error state
- `domotaicrmVer2/src/pages/Capacity.tsx` — add error state
- `domotaicrmVer2/src/pages/Incidents.tsx` — add error state

### 1.2 Admin-Create Security

**Problem:** `POST /users/admin-create` accepts requests from any authenticated user. A freelancer or client could create admin users.

**Fix:**
- Add role check in the controller: only `salesman` and `admin` roles can create users
- Validate that the requesting user belongs to the target organization

**Files:**
- `crmdomotaibackVer2/src/controllers/user.controller.ts` — add role check in `adminCreate`

### 1.3 Complete Email Notifications

**Problem:** Only 3 notification triggers exist (task assigned, task comment, invoice send). Critical commercial events don't trigger notifications.

**New triggers to add:**
- **Lead assigned** — when a lead's `assignedTo` changes, email the new assignee
- **Lead stage change** — when a lead moves stages, email the assignee (useful for tracking pipeline progress)
- **Task due tomorrow** — daily check at 8am for tasks due the next day, email the assignee

**Implementation:**
- Lead assigned/stage change: add to `LeadController.update()` — detect field changes and call `notify()`
- Task due reminder: new cron-style endpoint or scheduled function that queries tasks with `dueDate = tomorrow` and sends emails
- All emails use existing `emailService` with Domotai HTML template
- Check `NotificationPreference` before sending (implemented in Wave 2.6, but the check infrastructure goes here)

**Files:**
- `crmdomotaibackVer2/src/controllers/lead.controller.ts` — add notification triggers in update
- `crmdomotaibackVer2/src/utils/notify.ts` — add new notification types
- `crmdomotaibackVer2/src/utils/email.ts` — add email templates for lead assigned, lead stage change, task due reminder

### 1.4 Persistent Time Tracking Timer

**Problem:** The active timer resets when the user refreshes the page. Running timers are lost.

**Fix:**
- On timer start: save `{ startTime, projectId, taskId, description }` to `localStorage`
- On page load: check localStorage for active timer, restore it with elapsed time calculation
- On timer stop: clear localStorage entry
- Show elapsed time from `startTime` to `now` (recalculated each second)

**Files:**
- `domotaicrmVer2/src/pages/TimeTracking.tsx` — add localStorage persistence logic

### 1.5 Database Indexes

**Problem:** Frequently filtered columns lack indexes. With growing data, queries will slow down.

**Indexes to add (Prisma schema):**
```prisma
// Lead model
@@index([organizationId, stage])
@@index([pipelineId])

// Task model  
@@index([organizationId, status])

// Contact model
@@index([organizationId, deletedAt])

// ProjectTask model
@@index([projectId, status])
```

**Files:**
- `crmdomotaibackVer2/prisma/schema.prisma` — add index annotations
- Run `prisma migrate dev --name add_performance_indexes`

### 1.6 Strict Validators

**Problem:** All Zod validators use `.passthrough()` which allows extra fields. A malicious request could inject `organizationId`, `createdBy`, or `role` fields.

**Fix:**
- Change `.passthrough()` to `.strict()` in all validators
- This makes Zod reject any field not explicitly defined in the schema
- Backend controllers already extract specific fields from `req.body`, so strict mode won't break functionality

**Files:**
- `crmdomotaibackVer2/src/validators/lead.validator.ts`
- `crmdomotaibackVer2/src/validators/contact.validator.ts`
- `crmdomotaibackVer2/src/validators/company.validator.ts`
- `crmdomotaibackVer2/src/validators/task.validator.ts`
- `crmdomotaibackVer2/src/validators/project.validator.ts`
- `crmdomotaibackVer2/src/validators/portal.validator.ts`

---

## Wave 2 — Productivity

### 2.1 Pipeline CSV Export

**Feature:** "Export" button on LeadBoard and CommercialDashboard that downloads a CSV of the current pipeline data.

**CSV columns:** Lead Name, Stage, Amount, Pricing Type, Contact Name, Contact Email, Company, Assigned To, Created Date, Last Updated

**Implementation:**
- Frontend-side CSV generation (no backend endpoint needed) — build CSV string from existing `data` array in LeadBoard/CommercialDashboard
- Use `Blob` + `URL.createObjectURL` for download
- Filter-aware: exports whatever the current view shows (respects pipeline selector, date filters)

**Files:**
- `domotaicrmVer2/src/components/leads/LeadBoard.tsx` — add Export button + CSV generation
- `domotaicrmVer2/src/components/dashboard/CommercialDashboard.tsx` — add Export button

### 2.2 Weekly Email Digest

**Feature:** Every Monday at 8am, send a pipeline summary email to all team members.

**Email content:**
- Leads created this week (count + total value)
- Leads closed won (count + value)
- Leads closed lost (count)
- Overdue tasks (count)
- Top 5 leads by amount in active stages

**Implementation:**
- New endpoint `POST /dashboard/weekly-digest` that generates and sends the report
- Triggered by external cron (crontab on EC2) or a simple `setInterval` in the server
- Uses existing `emailService` with a new HTML template

**Files:**
- `crmdomotaibackVer2/src/controllers/dashboard.controller.ts` — add `weeklyDigest` method
- `crmdomotaibackVer2/src/routes/dashboard.routes.ts` — add route
- `crmdomotaibackVer2/src/utils/email.ts` — add digest template
- EC2 crontab: `0 8 * * 1 curl -s http://localhost:3000/dashboard/weekly-digest`

### 2.3 AI Agent Conversation Memory

**Problem:** Each AI chat request starts fresh with no context from previous messages.

**Implementation:**
- New model `AiChatMessage { id, organizationId, userId, role (user/assistant), content, createdAt }`
- On each chat request, load last 10 messages for the user and include them in the OpenAI prompt
- Save both user message and assistant response after each exchange
- Add "Clear conversation" button in the frontend

**Files:**
- `crmdomotaibackVer2/prisma/schema.prisma` — add AiChatMessage model
- `crmdomotaibackVer2/src/controllers/ai-agent.controller.ts` — load/save conversation history
- `domotaicrmVer2/src/components/ai/CommercialAgent.tsx` — add clear button

### 2.4 Calendar Week View

**Feature:** Toggle between month and week view in the Calendar page.

**Implementation:**
- Add view toggle (Month | Week) above the calendar
- Week view: 7-column grid with time slots (8am-8pm) showing events as positioned blocks
- Use existing calendar data — just change the rendering layout
- Default to month view (current behavior)

**Files:**
- `domotaicrmVer2/src/pages/Calendar.tsx` — add view toggle + week view rendering

### 2.5 Email Retry with Backoff

**Problem:** If SMTP fails, the email is lost silently.

**Fix:**
- Wrap `emailService.send()` in a retry function: 3 attempts with exponential backoff (1s, 5s, 15s)
- If all attempts fail, log to AuditLog with `action: 'EMAIL_FAILED'` and the error message
- No queue needed — just sequential retry in the same async call

**Files:**
- `crmdomotaibackVer2/src/utils/email.ts` — add retry wrapper

### 2.6 Notification Preferences UI

**Problem:** `NotificationPreference` model exists but is never read or written.

**Implementation:**
- Before sending any notification/email, check user's preferences: `prisma.notificationPreference.findFirst({ where: { userId, type } })`
- If preference exists and `enabled: false`, skip the notification
- If no preference exists, default to enabled (opt-out model)
- Frontend: add a "Notification Preferences" section in the user's profile or settings, with toggles per notification type (task_assigned, lead_assigned, lead_stage_change, task_due_reminder, weekly_digest)

**Files:**
- `crmdomotaibackVer2/src/utils/notify.ts` — add preference check before sending
- `domotaicrmVer2/src/components/notifications/NotificationPreferences.tsx` — preference toggles UI (may already exist)

---

## Wave 3 — Robustness

### 3.1 Organization Isolation

**Fix:**
- `OrganizationController.show()`: verify requesting user is a member before returning data
- `MediaController`: validate `x-organization-id` header
- Audit all controllers to ensure every query includes `organizationId` in the where clause

**Files:**
- `crmdomotaibackVer2/src/controllers/organization.controller.ts`
- `crmdomotaibackVer2/src/controllers/media.controller.ts`

### 3.2 N+1 Query Optimization

**Fix:**
- `TaskController`: use `include: { assignee }` in create/update instead of separate `prisma.profile.findUnique()` for email
- `InvoiceController`: use included contact data instead of separate query
- `AiAgentController`: consolidate 3 separate findMany calls into optimized queries

**Files:**
- `crmdomotaibackVer2/src/controllers/task.controller.ts`
- `crmdomotaibackVer2/src/controllers/invoice.controller.ts`
- `crmdomotaibackVer2/src/controllers/ai-agent.controller.ts`

### 3.3 Invoice Payment Tracking

**Schema change:**
```prisma
model Invoice {
  // existing fields...
  paidAt        DateTime?
  paymentMethod String?    // "transfer", "cash", "card", "other"
}
```

**UI change:**
- When marking invoice as "Paid", show a small form: payment method + date (defaults to now)
- Invoice detail page shows status timeline: Draft → Sent (date) → Paid (date, method)

**Files:**
- `crmdomotaibackVer2/prisma/schema.prisma` — add fields
- `crmdomotaibackVer2/src/controllers/invoice.controller.ts` — update markAsPaid
- `domotaicrmVer2/src/pages/Invoices.tsx` — update paid flow UI

### 3.4 Standardized Error Responses

**Fix:**
- All error responses follow format: `{ error: string, details?: any, statusCode: number }`
- Update `sendError()` utility to always use this format
- Some controllers use `{ message }` — change to `{ error }`

**Files:**
- `crmdomotaibackVer2/src/utils/error.ts` — standardize format
- Audit all controllers using `sendError()`

### 3.5 AI Agent Error Handling

**Fix:**
- Wrap OpenAI API call in try/catch with 30s timeout
- If OpenAI returns error (quota, timeout, rate limit), return friendly message: "AI assistant is temporarily unavailable. Please try again."
- Log the error to console for debugging

**Files:**
- `crmdomotaibackVer2/src/controllers/ai-agent.controller.ts`

### 3.6 Email Template Caching

**Fix:**
- Pre-compile email templates at module load (not per-send)
- Store compiled templates in module-level variables
- Replace string concatenation with template function calls

**Files:**
- `crmdomotaibackVer2/src/utils/email.ts`

---

## Verification Plan

### Wave 1
1. Trigger a network error and verify toast appears (disconnect backend, refresh page)
2. Try creating a user as a `client` role — should be rejected
3. Assign a lead to a team member — verify email arrives
4. Start a timer, refresh the page — timer should continue
5. Run `EXPLAIN ANALYZE` on lead queries — verify index usage
6. Send a request with extra fields to validated endpoints — should be rejected

### Wave 2
1. Export pipeline to CSV — open in Excel, verify all columns present
2. Trigger weekly digest — verify email arrives with correct stats
3. Chat with AI agent, refresh, chat again — should remember context
4. Toggle calendar to week view — verify events show correctly
5. Kill SMTP temporarily, trigger an email — verify retry and eventual audit log
6. Toggle notification preferences off — verify emails stop for that type

### Wave 3
1. Try accessing another org's data — should return 403
2. Profile task creation time before/after N+1 fix
3. Mark invoice as paid — verify payment method and date saved
4. Trigger various errors — verify all follow `{ error, statusCode }` format
5. Set OpenAI key to invalid — verify friendly error message
6. Compare email send time before/after template caching
