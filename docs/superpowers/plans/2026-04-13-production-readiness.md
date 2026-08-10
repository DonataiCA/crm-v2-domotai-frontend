# DomotaiCRM Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DomotaiCRM production-ready by implementing 8 critical features: security hardening, audit logging, notification triggers, email integration, invoice PDFs, file uploads, and input validation.

**Architecture:** Backend (Express + Prisma) at `c:\Users\David\Documents\GitHub\crmdomotaibackVer2`, Frontend (React + Vite) at `c:\Users\David\Documents\GitHub\domotaicrmVer2`. All backend changes follow the existing pattern: controllers call repositories/services, routes apply middleware. Frontend uses shadcn/ui components and existing service layer.

**Tech Stack:** Express.js, Prisma 6, PostgreSQL, React 18, TypeScript, Zod, pdfkit, express-rate-limit, shadcn/ui, Nodemailer

---

## Task 1: Rate Limiting + CORS Restriction

**Files:**
- Modify: `crmdomotaibackVer2/src/app.ts`
- Modify: `crmdomotaibackVer2/package.json`

- [ ] **Step 1: Install express-rate-limit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
npm install express-rate-limit
```

- [ ] **Step 2: Add rate limiting and CORS config to app.ts**

In `crmdomotaibackVer2/src/app.ts`, add the import at the top:

```typescript
import rateLimit from 'express-rate-limit';
```

Replace `app.use(cors());` (line 43) with:

```typescript
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080', 'http://localhost:5173'],
    credentials: true,
}));
```

After `app.use(helmet());` (line 44), add rate limiters:

```typescript
// Global rate limiter: 200 requests per minute per IP
const globalLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// Strict limiter for auth endpoints: 10 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: 10,
    message: { error: 'Too many login attempts, please try again later' },
});
app.use('/users/login', authLimiter);
app.use('/users/register', authLimiter);
app.use('/portal/client-login', authLimiter);
```

Also replace `app.options('*', cors());` (line 62) with:

```typescript
app.options('*', cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080', 'http://localhost:5173'],
    credentials: true,
}));
```

- [ ] **Step 3: Add CORS_ORIGINS to .env**

Add to `crmdomotaibackVer2/.env`:

```
CORS_ORIGINS=http://localhost:8080,http://localhost:5173
```

- [ ] **Step 4: Restart backend and verify**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
# Kill existing and restart
npx ts-node --transpile-only src/server.ts
```

Test rate limiting works:
```bash
curl -i http://localhost:3000/health
# Should see RateLimit-* headers in response
```

- [ ] **Step 5: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/app.ts package.json package-lock.json .env
git commit -m "feat: add rate limiting and CORS restriction"
```

---

## Task 2: Validate Client Permissions in Portal

**Files:**
- Modify: `crmdomotaibackVer2/src/controllers/portal.controller.ts`

The portal guest endpoints (`createGuestTask`, `updateGuestTask`, `addGuestComment`) validate shareToken but never check if the share's `permissions` field includes the required permission. The permissions field stores a comma-separated string like `"view,comment"` or `"view,comment,create_task"`.

- [ ] **Step 1: Add permission helper at top of portal.controller.ts**

After the imports (line 6), add:

```typescript
function hasPermission(permissionsStr: string, required: string): boolean {
    const perms = permissionsStr.split(',').map(p => p.trim().toLowerCase());
    return perms.includes(required.toLowerCase());
}
```

- [ ] **Step 2: Add permission check to addGuestComment**

In the `addGuestComment` method, after the existing shareToken lookup query succeeds and before creating the comment, add:

```typescript
if (!hasPermission(share.permissions, 'comment')) {
    return sendError(res, 403, 'You do not have permission to comment on this project');
}
```

Find the line where `share` is validated (after the `if (!share)` check) and add this permission check right after it.

- [ ] **Step 3: Add permission check to createGuestTask**

In the `createGuestTask` method, after the share validation, add:

```typescript
if (!hasPermission(share.permissions, 'create_task')) {
    return sendError(res, 403, 'You do not have permission to create tasks on this project');
}
```

- [ ] **Step 4: Add permission check to updateGuestTask**

In the `updateGuestTask` method, after the share validation, add:

```typescript
if (!hasPermission(share.permissions, 'create_task')) {
    return sendError(res, 403, 'You do not have permission to edit tasks on this project');
}
```

- [ ] **Step 5: Verify with curl**

```bash
# Test with a share that only has "view" permission
curl -X POST http://localhost:3000/portal/<shareToken>/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"test","status":"TODO"}'
# Should return 403
```

- [ ] **Step 6: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/controllers/portal.controller.ts
git commit -m "feat: enforce permission checks on portal guest endpoints"
```

---

## Task 3: Audit Log Service + Integration

**Files:**
- Create: `crmdomotaibackVer2/src/utils/audit.ts`
- Modify: `crmdomotaibackVer2/src/controllers/project.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/lead.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/contact.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/invoice.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/task.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/organization.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/portal.controller.ts`

- [ ] **Step 1: Create the audit service utility**

Create `crmdomotaibackVer2/src/utils/audit.ts`:

```typescript
import { prisma } from '../config/prisma';
import { Request } from 'express';

interface AuditEntry {
    action: string;        // CREATE, UPDATE, DELETE, ARCHIVE, RESTORE, LOGIN, SHARE
    entityType: string;    // Project, Lead, Contact, Invoice, Task, User, Organization
    entityId?: string;
    entityName?: string;
    details?: string;
}

export async function logAudit(req: Request, entry: AuditEntry): Promise<void> {
    try {
        const userId = (req as any).userId || null;
        const organizationId = req.headers['x-organization-id'] as string || null;
        const ipAddress = req.ip || req.connection?.remoteAddress || null;

        if (!organizationId) return; // Can't log without org context

        await prisma.auditLog.create({
            data: {
                organizationId,
                userId,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId || null,
                entityName: entry.entityName || null,
                details: entry.details || null,
                ipAddress,
            },
        });
    } catch (error) {
        // Audit logging should never break the request
        console.error('[AUDIT] Failed to write audit log:', error);
    }
}
```

- [ ] **Step 2: Add audit logging to project controller**

In `crmdomotaibackVer2/src/controllers/project.controller.ts`, add import:

```typescript
import { logAudit } from '../utils/audit';
```

Add `logAudit` calls after successful operations:

In `create` (after `res.status(201).json(project)`):
```typescript
await logAudit(req, { action: 'CREATE', entityType: 'Project', entityId: project.id, entityName: project.name });
```

In `update` (after `res.json(updated)`):
```typescript
await logAudit(req, { action: 'UPDATE', entityType: 'Project', entityId: req.params.id });
```

In `delete` (after successful delete):
```typescript
await logAudit(req, { action: 'DELETE', entityType: 'Project', entityId: req.params.id });
```

In `archive` (after success):
```typescript
await logAudit(req, { action: 'ARCHIVE', entityType: 'Project', entityId: req.params.id });
```

In `createPhase` (after success):
```typescript
await logAudit(req, { action: 'CREATE', entityType: 'ProjectPhase', entityId: phase.id, entityName: phase.name });
```

In `createTask` (after success):
```typescript
await logAudit(req, { action: 'CREATE', entityType: 'ProjectTask', entityId: task.id, entityName: task.title });
```

In `updateTask` (after success):
```typescript
await logAudit(req, { action: 'UPDATE', entityType: 'ProjectTask', entityId: req.params.taskId });
```

In `deleteTask` (after success):
```typescript
await logAudit(req, { action: 'DELETE', entityType: 'ProjectTask', entityId: req.params.taskId });
```

- [ ] **Step 3: Add audit logging to lead controller**

In `crmdomotaibackVer2/src/controllers/lead.controller.ts`, add import and calls:

```typescript
import { logAudit } from '../utils/audit';
```

After `create` success:
```typescript
await logAudit(req, { action: 'CREATE', entityType: 'Lead', entityId: lead.id, entityName: lead.name });
```

After `update` success:
```typescript
await logAudit(req, { action: 'UPDATE', entityType: 'Lead', entityId: req.params.id });
```

After `delete` success:
```typescript
await logAudit(req, { action: 'DELETE', entityType: 'Lead', entityId: req.params.id });
```

After `convert` success:
```typescript
await logAudit(req, { action: 'CONVERT', entityType: 'Lead', entityId: req.params.id, details: 'Lead converted to deal' });
```

- [ ] **Step 4: Add audit logging to contact, invoice, task, organization controllers**

Repeat the same pattern for each controller — import `logAudit`, add calls after each successful CREATE/UPDATE/DELETE operation. The pattern is identical:

```typescript
// contact.controller.ts — create, update, delete, archive, restore, bulkDelete
// invoice.controller.ts — create, update, delete, markPaid, markSent
// task.controller.ts — create, update, delete, bulkDelete, bulkUpdate
// organization.controller.ts — create, update, addMember, removeMember, updateMemberRole
```

Each call follows:
```typescript
await logAudit(req, { action: 'ACTION', entityType: 'EntityType', entityId: entity.id, entityName: entity.name || entity.title });
```

- [ ] **Step 5: Add audit logging to portal share**

In `portal.controller.ts`, after successful `shareProject`:

```typescript
await logAudit(req, { action: 'SHARE', entityType: 'Project', entityId: projectId, details: `Shared with ${email}` });
```

- [ ] **Step 6: Restart and verify**

```bash
# Restart backend, then create a lead/project via the UI.
# Check audit logs:
curl http://localhost:3000/audit-logs \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
# Should now return entries
```

- [ ] **Step 7: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/utils/audit.ts src/controllers/
git commit -m "feat: add audit log writes across all CRUD controllers"
```

---

## Task 4: Notification Creation Service + Controller Triggers

**Files:**
- Create: `crmdomotaibackVer2/src/utils/notify.ts`
- Modify: `crmdomotaibackVer2/src/repositories/notification.repository.ts`
- Modify: `crmdomotaibackVer2/src/controllers/project.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/task.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/lead.controller.ts`
- Modify: `crmdomotaibackVer2/src/controllers/invoice.controller.ts`

- [ ] **Step 1: Add create method to notification repository**

In `crmdomotaibackVer2/src/repositories/notification.repository.ts`, add at the end of the exported object (before the closing `};`):

```typescript
    create: (data: {
        organizationId: string;
        type: string;
        title: string;
        body?: string;
        entityType?: string;
        entityId?: string;
        actorId?: string;
        metadata?: Record<string, unknown>;
    }) =>
        prisma.notification.create({ data }),
```

- [ ] **Step 2: Create the notify service utility**

Create `crmdomotaibackVer2/src/utils/notify.ts`:

```typescript
import { NotificationRepository } from '../repositories/notification.repository';
import { emailService } from './email';
import { prisma } from '../config/prisma';

interface NotifyParams {
    organizationId: string;
    type: string;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    recipientUserId?: string;   // If set, also sends email based on preferences
    recipientEmail?: string;    // Email override (for guest notifications)
    metadata?: Record<string, unknown>;
}

export async function notify(params: NotifyParams): Promise<void> {
    try {
        // 1. Create in-app notification
        await NotificationRepository.create({
            organizationId: params.organizationId,
            type: params.type,
            title: params.title,
            body: params.body,
            entityType: params.entityType,
            entityId: params.entityId,
            actorId: params.actorId,
            metadata: params.metadata,
        });

        // 2. Send email if recipient provided
        if (params.recipientEmail && params.type) {
            await sendEmailForType(params);
        } else if (params.recipientUserId) {
            // Look up user email from profile
            const profile = await prisma.profile.findUnique({
                where: { id: params.recipientUserId },
                select: { email: true, fullName: true },
            });
            if (profile?.email) {
                await sendEmailForType({ ...params, recipientEmail: profile.email });
            }
        }
    } catch (error) {
        console.error('[NOTIFY] Failed to send notification:', error);
    }
}

async function sendEmailForType(params: NotifyParams & { recipientEmail?: string }): Promise<void> {
    if (!params.recipientEmail) return;

    const meta = params.metadata || {};

    switch (params.type) {
        case 'TASK_ASSIGNED':
        case 'PROJECT_TASK_ASSIGNED':
            await emailService.sendTaskAssigned(
                params.recipientEmail,
                (meta.assigneeName as string) || 'Team member',
                (meta.taskTitle as string) || params.title,
                (meta.projectName as string) || '',
                (meta.dueDate as string) || '',
                (meta.assignedBy as string) || ''
            );
            break;

        case 'TASK_COMMENT':
            await emailService.sendNewComment(
                params.recipientEmail,
                (meta.recipientName as string) || 'Team member',
                (meta.commenterName as string) || 'Someone',
                (meta.taskTitle as string) || '',
                (meta.commentContent as string) || params.body || '',
                (meta.projectName as string) || ''
            );
            break;

        case 'TASK_DUE_SOON':
            await emailService.sendTaskReminder(
                params.recipientEmail,
                (meta.assigneeName as string) || 'Team member',
                (meta.taskTitle as string) || params.title,
                (meta.projectName as string) || '',
                (meta.dueDate as string) || ''
            );
            break;

        case 'INVOICE_SENT':
            // Will be handled by Task 6 (Invoice PDF)
            break;

        default:
            // No specific email template for this type
            break;
    }
}
```

- [ ] **Step 3: Add notification triggers to project controller**

In `crmdomotaibackVer2/src/controllers/project.controller.ts`, add import:

```typescript
import { notify } from '../utils/notify';
```

After `createTask` succeeds and the task has an `assignedTo`:

```typescript
if (task.assignedTo) {
    const creator = await prisma.profile.findUnique({ where: { id: (req as any).userId }, select: { fullName: true } });
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    await notify({
        organizationId,
        type: 'PROJECT_TASK_ASSIGNED',
        title: `New task assigned: ${task.title}`,
        body: `You have been assigned a new task in ${project?.name || 'a project'}`,
        entityType: 'ProjectTask',
        entityId: task.id,
        actorId: (req as any).userId,
        recipientUserId: task.assignedTo,
        metadata: {
            taskTitle: task.title,
            projectName: project?.name || '',
            assigneeName: task.assignee?.fullName || task.assignee?.full_name || '',
            assignedBy: creator?.fullName || '',
            dueDate: task.dueDate || task.due_date || '',
        },
    });
}
```

After `updateTask` succeeds and assignedTo changed:

```typescript
// Only notify if assignee was changed
if (req.body.assignedTo && req.body.assignedTo !== existingTask?.assignedTo) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    await notify({
        organizationId,
        type: 'PROJECT_TASK_ASSIGNED',
        title: `Task reassigned: ${updated.title}`,
        entityType: 'ProjectTask',
        entityId: updated.id,
        actorId: (req as any).userId,
        recipientUserId: req.body.assignedTo,
        metadata: { taskTitle: updated.title, projectName: project?.name || '' },
    });
}
```

- [ ] **Step 4: Add notification triggers to task controller**

In `crmdomotaibackVer2/src/controllers/task.controller.ts`, add import:

```typescript
import { notify } from '../utils/notify';
```

After `addComment` succeeds — notify the task assignee (if not the commenter):

```typescript
const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { title: true, assignedTo: true } });
if (task?.assignedTo && task.assignedTo !== (req as any).userId) {
    const commenter = await prisma.profile.findUnique({ where: { id: (req as any).userId }, select: { fullName: true } });
    const organizationId = req.headers['x-organization-id'] as string;
    await notify({
        organizationId,
        type: 'TASK_COMMENT',
        title: `New comment on: ${task.title}`,
        entityType: 'Task',
        entityId: req.params.id,
        actorId: (req as any).userId,
        recipientUserId: task.assignedTo,
        metadata: {
            taskTitle: task.title,
            commenterName: commenter?.fullName || 'Someone',
            commentContent: req.body.content || '',
        },
    });
}
```

- [ ] **Step 5: Add notification triggers to lead controller**

In `crmdomotaibackVer2/src/controllers/lead.controller.ts`, add import and call after `create` when `assignedTo` is set:

```typescript
import { notify } from '../utils/notify';

// After create success, if lead.assignedTo:
if (lead.assignedTo) {
    await notify({
        organizationId,
        type: 'LEAD_ASSIGNED',
        title: `New lead assigned: ${lead.name}`,
        entityType: 'Lead',
        entityId: lead.id,
        actorId: (req as any).userId,
        recipientUserId: lead.assignedTo,
        metadata: { leadName: lead.name },
    });
}
```

- [ ] **Step 6: Add notification trigger to invoice controller**

In `crmdomotaibackVer2/src/controllers/invoice.controller.ts`, after `markSent` success:

```typescript
import { notify } from '../utils/notify';

// After markSent — notify the contact if they have a user account
if (invoice.contactId) {
    const contact = await prisma.contact.findUnique({ where: { id: invoice.contactId }, select: { email: true, name: true } });
    if (contact?.email) {
        await notify({
            organizationId,
            type: 'INVOICE_SENT',
            title: `Invoice ${invoice.invoiceNumber} sent`,
            entityType: 'Invoice',
            entityId: invoice.id,
            actorId: (req as any).userId,
            recipientEmail: contact.email,
            metadata: { invoiceNumber: invoice.invoiceNumber, contactName: contact.name },
        });
    }
}
```

- [ ] **Step 7: Restart and test**

```bash
# Restart backend
# Create a task with an assignee in the UI
# Check notifications:
curl http://localhost:3000/notifications \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>"
# Should see the new task assignment notification
```

- [ ] **Step 8: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/utils/notify.ts src/repositories/notification.repository.ts src/controllers/
git commit -m "feat: add notification creation service with email + in-app triggers"
```

---

## Task 5: Zod Validation Middleware + Schemas for All Controllers

**Files:**
- Create: `crmdomotaibackVer2/src/middlewares/validate.middleware.ts`
- Create: `crmdomotaibackVer2/src/validators/common.ts`
- Create: `crmdomotaibackVer2/src/validators/contact.validator.ts`
- Create: `crmdomotaibackVer2/src/validators/lead.validator.ts`
- Create: `crmdomotaibackVer2/src/validators/project.validator.ts`
- Create: `crmdomotaibackVer2/src/validators/invoice.validator.ts`
- Create: `crmdomotaibackVer2/src/validators/task.validator.ts`
- Create: `crmdomotaibackVer2/src/validators/organization.validator.ts`
- Create: `crmdomotaibackVer2/src/validators/calendar.validator.ts`
- Create: `crmdomotaibackVer2/src/validators/portal.validator.ts`
- Modify: `crmdomotaibackVer2/src/routes/contact.routes.ts`
- Modify: `crmdomotaibackVer2/src/routes/lead.routes.ts`
- Modify: `crmdomotaibackVer2/src/routes/project.routes.ts`
- Modify: `crmdomotaibackVer2/src/routes/invoice.routes.ts`
- Modify: `crmdomotaibackVer2/src/routes/task.routes.ts`
- Modify: `crmdomotaibackVer2/src/routes/organization.routes.ts`
- Modify: `crmdomotaibackVer2/src/routes/calendar.routes.ts`
- Modify: `crmdomotaibackVer2/src/routes/portal.routes.ts`

- [ ] **Step 1: Create the validation middleware**

Create `crmdomotaibackVer2/src/middlewares/validate.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = schema.parse(req[source]);
            req[source] = parsed; // Replace with validated + coerced data
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
                return res.status(400).json({
                    error: 'Validation failed',
                    details: messages,
                });
            }
            next(error);
        }
    };
}
```

- [ ] **Step 2: Create common validators**

Create `crmdomotaibackVer2/src/validators/common.ts`:

```typescript
import { z } from 'zod';

export const uuidParam = z.object({ id: z.string().uuid() });

export const paginationQuery = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(1000).optional().default(20),
});

export const isoDateString = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional();
```

- [ ] **Step 3: Create entity validators**

Create `crmdomotaibackVer2/src/validators/contact.validator.ts`:

```typescript
import { z } from 'zod';

export const createContactSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    company: z.string().max(200).optional().nullable(),
    position: z.string().max(200).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    source: z.string().max(50).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
}).passthrough();

export const updateContactSchema = createContactSchema.partial();
```

Create `crmdomotaibackVer2/src/validators/lead.validator.ts`:

```typescript
import { z } from 'zod';

export const createLeadSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    stage: z.string().max(50).optional(),
    pipelineId: z.string().uuid().optional().nullable(),
    price: z.number().or(z.string().transform(Number)).optional().nullable(),
    contactId: z.string().uuid().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    source: z.string().max(100).optional().nullable(),
    priority: z.string().max(20).optional().nullable(),
    expectedCloseDate: z.string().optional().nullable(),
}).passthrough();

export const updateLeadSchema = createLeadSchema.partial();
```

Create `crmdomotaibackVer2/src/validators/project.validator.ts`:

```typescript
import { z } from 'zod';

export const createProjectSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    description: z.string().max(10000).optional().nullable(),
    status: z.string().max(50).optional(),
    price: z.number().or(z.string().transform(Number)).optional().nullable(),
    revenue: z.number().or(z.string().transform(Number)).optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    projectLeadId: z.string().uuid().optional().nullable(),
}).passthrough();

export const updateProjectSchema = createProjectSchema.partial();

export const createPhaseSchema = z.object({
    name: z.string().min(1, 'Phase name is required').max(200),
    status: z.string().max(50).optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    orderIndex: z.number().int().optional(),
}).passthrough();

export const createTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(10000).optional().nullable(),
    status: z.string().max(50).optional(),
    priority: z.string().max(20).optional().nullable(),
    phaseId: z.string().uuid().optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    estimatedHours: z.number().optional().nullable(),
}).passthrough();
```

Create `crmdomotaibackVer2/src/validators/invoice.validator.ts`:

```typescript
import { z } from 'zod';

export const createInvoiceSchema = z.object({
    invoiceNumber: z.string().max(50).optional(),
    contactId: z.string().uuid().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    issueDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    subtotal: z.number().or(z.string().transform(Number)).optional(),
    tax: z.number().or(z.string().transform(Number)).optional(),
    total: z.number().or(z.string().transform(Number)).optional(),
    currency: z.string().max(10).optional(),
    notes: z.string().max(5000).optional().nullable(),
    items: z.array(z.object({
        description: z.string().min(1),
        quantity: z.number().or(z.string().transform(Number)),
        unitPrice: z.number().or(z.string().transform(Number)),
        total: z.number().or(z.string().transform(Number)),
    })).optional(),
}).passthrough();

export const updateInvoiceSchema = createInvoiceSchema.partial();
```

Create `crmdomotaibackVer2/src/validators/task.validator.ts`:

```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(10000).optional().nullable(),
    status: z.string().max(50).optional(),
    priority: z.string().max(20).optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    contactId: z.string().uuid().optional().nullable(),
    leadId: z.string().uuid().optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
    dueDate: z.string().optional().nullable(),
}).passthrough();

export const updateTaskSchema = createTaskSchema.partial();

export const addCommentSchema = z.object({
    content: z.string().min(1, 'Comment content is required').max(10000),
}).passthrough();
```

Create `crmdomotaibackVer2/src/validators/organization.validator.ts`:

```typescript
import { z } from 'zod';

export const createOrgSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    slug: z.string().max(100).optional(),
    logoUrl: z.string().url().optional().nullable(),
    colorScheme: z.string().max(50).optional().nullable(),
}).passthrough();

export const addMemberSchema = z.object({
    userId: z.string().uuid('Valid user ID required'),
    role: z.enum(['admin', 'member', 'client']).optional().default('member'),
}).passthrough();
```

Create `crmdomotaibackVer2/src/validators/calendar.validator.ts`:

```typescript
import { z } from 'zod';

export const createEventSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional().nullable(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().nullable(),
    allDay: z.boolean().optional(),
    contactId: z.string().uuid().optional().nullable(),
    leadId: z.string().uuid().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
}).passthrough();

export const updateEventSchema = createEventSchema.partial();
```

Create `crmdomotaibackVer2/src/validators/portal.validator.ts`:

```typescript
import { z } from 'zod';

export const shareProjectSchema = z.object({
    email: z.string().email('Valid email required'),
    name: z.string().min(1, 'Name is required').max(200),
    permissions: z.string().or(z.array(z.string())).optional(),
}).passthrough();

export const clientLoginSchema = z.object({
    email: z.string().email('Valid email required'),
});

export const guestCommentSchema = z.object({
    content: z.string().min(1, 'Comment is required').max(10000),
    guestEmail: z.string().email().optional(),
    guestName: z.string().max(200).optional(),
}).passthrough();

export const guestTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(10000).optional().nullable(),
    status: z.string().max(50).optional(),
    priority: z.string().max(20).optional().nullable(),
}).passthrough();
```

- [ ] **Step 4: Apply validators to route files**

For each route file, import the `validate` middleware and the relevant schema, then add it as middleware to POST/PUT routes.

**Example for `contact.routes.ts`:**

```typescript
import { validate } from '../middlewares/validate.middleware';
import { createContactSchema, updateContactSchema } from '../validators/contact.validator';

// Change:
router.post('/', ContactController.create);
// To:
router.post('/', validate(createContactSchema), ContactController.create);

// Change:
router.put('/:id', ContactController.update);
// To:
router.put('/:id', validate(updateContactSchema), ContactController.update);
```

Apply the same pattern to all route files:
- `lead.routes.ts` — `createLeadSchema` on POST, `updateLeadSchema` on PUT
- `project.routes.ts` — `createProjectSchema` on POST /, `updateProjectSchema` on PUT /:id, `createPhaseSchema` on POST /:id/phases, `createTaskSchema` on POST /:id/tasks
- `invoice.routes.ts` — `createInvoiceSchema` on POST, `updateInvoiceSchema` on PUT
- `task.routes.ts` — `createTaskSchema` on POST, `updateTaskSchema` on PUT, `addCommentSchema` on POST /:id/comments
- `organization.routes.ts` — `createOrgSchema` on POST, `addMemberSchema` on POST /:id/members
- `calendar.routes.ts` — `createEventSchema` on POST, `updateEventSchema` on PUT
- `portal.routes.ts` — `clientLoginSchema` on POST /client-login, `shareProjectSchema` on POST /projects/:projectId/share

- [ ] **Step 5: Update error middleware to handle ZodError**

In `crmdomotaibackVer2/src/middlewares/error.middleware.ts`, replace contents:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ZodError) {
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return res.status(400).json({ error: 'Validation failed', details: messages });
    }

    logger.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
}
```

- [ ] **Step 6: Restart and test validation**

```bash
# Restart backend, then test with invalid data:
curl -X POST http://localhost:3000/contacts \
  -H "Authorization: Bearer <token>" \
  -H "x-organization-id: <orgId>" \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 400 with "name: Name is required"
```

- [ ] **Step 7: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/middlewares/validate.middleware.ts src/validators/ src/routes/ src/middlewares/error.middleware.ts
git commit -m "feat: add Zod validation middleware and schemas for all controllers"
```

---

## Task 6: Invoice PDF Generation + Email

**Files:**
- Modify: `crmdomotaibackVer2/package.json` (install pdfkit)
- Create: `crmdomotaibackVer2/src/utils/pdf.ts`
- Modify: `crmdomotaibackVer2/src/controllers/invoice.controller.ts`
- Modify: `crmdomotaibackVer2/src/routes/invoice.routes.ts`
- Modify: `crmdomotaibackVer2/src/utils/email.ts`
- Modify: `domotaicrmVer2/src/services/invoice.service.ts`
- Modify: `domotaicrmVer2/src/pages/Invoices.tsx`

- [ ] **Step 1: Install pdfkit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
npm install pdfkit
npm install -D @types/pdfkit
```

- [ ] **Step 2: Create PDF generation utility**

Create `crmdomotaibackVer2/src/utils/pdf.ts`:

```typescript
import PDFDocument from 'pdfkit';

interface InvoiceData {
    invoiceNumber: string;
    status: string;
    issueDate: string | null;
    dueDate: string | null;
    currency: string;
    subtotal: number;
    tax: number;
    total: number;
    notes: string | null;
    contact: { name: string; email?: string; phone?: string; company?: string } | null;
    organization: { name: string } | null;
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
}

export function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const BLUE = '#4A89B9';
        const ORANGE = '#FF5F00';
        const DARK = '#1e293b';
        const GRAY = '#475569';

        // Header
        doc.fontSize(24).fillColor(BLUE).text('DOMOT', 50, 50, { continued: true })
           .fillColor(ORANGE).text('AI');
        doc.fontSize(10).fillColor(GRAY).text(invoice.organization?.name || 'Domotai Technologies', 50, 80);

        // Invoice title
        doc.fontSize(28).fillColor(DARK).text('INVOICE', 350, 50, { align: 'right' });
        doc.fontSize(12).fillColor(GRAY).text(`#${invoice.invoiceNumber}`, 350, 85, { align: 'right' });
        doc.fontSize(10).text(`Status: ${invoice.status}`, 350, 102, { align: 'right' });

        // Dates
        let y = 130;
        doc.fontSize(10).fillColor(DARK);
        if (invoice.issueDate) {
            doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 50, y);
            y += 16;
        }
        if (invoice.dueDate) {
            doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, y);
            y += 16;
        }

        // Bill To
        if (invoice.contact) {
            y += 10;
            doc.fontSize(11).fillColor(BLUE).text('Bill To:', 50, y);
            y += 18;
            doc.fontSize(10).fillColor(DARK).text(invoice.contact.name, 50, y);
            if (invoice.contact.company) { y += 14; doc.text(invoice.contact.company, 50, y); }
            if (invoice.contact.email) { y += 14; doc.fillColor(GRAY).text(invoice.contact.email, 50, y); }
            if (invoice.contact.phone) { y += 14; doc.text(invoice.contact.phone, 50, y); }
        }

        // Items table
        y = Math.max(y + 40, 250);

        // Table header
        doc.rect(50, y, 495, 24).fill(BLUE);
        doc.fontSize(9).fillColor('#ffffff');
        doc.text('Description', 58, y + 7, { width: 220 });
        doc.text('Qty', 290, y + 7, { width: 60, align: 'center' });
        doc.text('Unit Price', 355, y + 7, { width: 80, align: 'right' });
        doc.text('Total', 445, y + 7, { width: 92, align: 'right' });
        y += 24;

        // Table rows
        const cur = invoice.currency || 'USD';
        for (const item of invoice.items) {
            const rowH = 22;
            const bgColor = invoice.items.indexOf(item) % 2 === 0 ? '#f8fafc' : '#ffffff';
            doc.rect(50, y, 495, rowH).fill(bgColor);
            doc.fontSize(9).fillColor(DARK);
            doc.text(item.description, 58, y + 6, { width: 220 });
            doc.text(String(item.quantity), 290, y + 6, { width: 60, align: 'center' });
            doc.text(`${Number(item.unitPrice).toFixed(2)}`, 355, y + 6, { width: 80, align: 'right' });
            doc.text(`${Number(item.total).toFixed(2)}`, 445, y + 6, { width: 92, align: 'right' });
            y += rowH;
        }

        // Totals
        y += 16;
        doc.fontSize(10).fillColor(GRAY);
        doc.text('Subtotal:', 370, y, { width: 70, align: 'right' });
        doc.fillColor(DARK).text(`${Number(invoice.subtotal).toFixed(2)} ${cur}`, 445, y, { width: 92, align: 'right' });
        y += 18;
        doc.fillColor(GRAY).text('Tax:', 370, y, { width: 70, align: 'right' });
        doc.fillColor(DARK).text(`${Number(invoice.tax).toFixed(2)} ${cur}`, 445, y, { width: 92, align: 'right' });
        y += 20;
        doc.rect(370, y - 2, 170, 24).fill(DARK);
        doc.fontSize(11).fillColor('#ffffff').text('Total:', 378, y + 4, { width: 60, align: 'right' });
        doc.text(`${Number(invoice.total).toFixed(2)} ${cur}`, 445, y + 4, { width: 92, align: 'right' });

        // Notes
        if (invoice.notes) {
            y += 50;
            doc.fontSize(10).fillColor(BLUE).text('Notes:', 50, y);
            y += 16;
            doc.fontSize(9).fillColor(GRAY).text(invoice.notes, 50, y, { width: 400 });
        }

        // Footer
        doc.fontSize(8).fillColor(GRAY)
           .text('Generated by Domotai CRM', 50, 760, { align: 'center', width: 495 });

        doc.end();
    });
}
```

- [ ] **Step 3: Add PDF endpoint to invoice controller**

In `crmdomotaibackVer2/src/controllers/invoice.controller.ts`, add import:

```typescript
import { generateInvoicePDF } from '../utils/pdf';
```

Add new methods to the controller object:

```typescript
    generatePDF: async (req: Request, res: Response) => {
        try {
            const invoice = await InvoiceRepository.findById(req.params.id);
            if (!invoice) return sendError(res, 404, 'Invoice not found');

            const org = await prisma.organization.findUnique({
                where: { id: invoice.organizationId },
                select: { name: true },
            });

            const pdfBuffer = await generateInvoicePDF({
                invoiceNumber: invoice.invoiceNumber || invoice.id.slice(0, 8),
                status: invoice.status,
                issueDate: invoice.issueDate?.toISOString() || null,
                dueDate: invoice.dueDate?.toISOString() || null,
                currency: invoice.currency || 'USD',
                subtotal: Number(invoice.subtotal) || 0,
                tax: Number(invoice.tax) || 0,
                total: Number(invoice.total) || 0,
                notes: invoice.notes,
                contact: invoice.contact ? {
                    name: invoice.contact.name,
                    email: invoice.contact.email || undefined,
                    phone: invoice.contact.phoneNumber || undefined,
                    company: invoice.contact.company || undefined,
                } : null,
                organization: org,
                items: (invoice.items || []).map(i => ({
                    description: i.description,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    total: Number(i.total),
                })),
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber || invoice.id.slice(0, 8)}.pdf"`);
            res.send(pdfBuffer);
        } catch (error) {
            return sendError(res, 500, 'Failed to generate PDF', error);
        }
    },

    sendByEmail: async (req: Request, res: Response) => {
        try {
            const invoice = await InvoiceRepository.findById(req.params.id);
            if (!invoice) return sendError(res, 404, 'Invoice not found');

            if (!invoice.contact?.email) {
                return sendError(res, 400, 'Invoice contact has no email address');
            }

            const org = await prisma.organization.findUnique({
                where: { id: invoice.organizationId },
                select: { name: true },
            });

            const pdfBuffer = await generateInvoicePDF({
                invoiceNumber: invoice.invoiceNumber || invoice.id.slice(0, 8),
                status: invoice.status,
                issueDate: invoice.issueDate?.toISOString() || null,
                dueDate: invoice.dueDate?.toISOString() || null,
                currency: invoice.currency || 'USD',
                subtotal: Number(invoice.subtotal) || 0,
                tax: Number(invoice.tax) || 0,
                total: Number(invoice.total) || 0,
                notes: invoice.notes,
                contact: invoice.contact ? {
                    name: invoice.contact.name,
                    email: invoice.contact.email || undefined,
                    phone: invoice.contact.phoneNumber || undefined,
                    company: invoice.contact.company || undefined,
                } : null,
                organization: org,
                items: (invoice.items || []).map(i => ({
                    description: i.description,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    total: Number(i.total),
                })),
            });

            await emailService.sendInvoice(
                invoice.contact.email,
                invoice.contact.name,
                invoice.invoiceNumber || invoice.id.slice(0, 8),
                Number(invoice.total) || 0,
                invoice.currency || 'USD',
                invoice.dueDate?.toISOString() || null,
                org?.name || 'Domotai Technologies',
                pdfBuffer
            );

            // Mark as sent
            await InvoiceRepository.markSent(req.params.id);

            res.json({ success: true, message: 'Invoice sent by email' });
        } catch (error) {
            return sendError(res, 500, 'Failed to send invoice', error);
        }
    },
```

Add the `prisma` and `emailService` imports at the top if not already present:

```typescript
import { prisma } from '../config/prisma';
import { emailService } from '../utils/email';
```

- [ ] **Step 4: Add routes for PDF endpoints**

In `crmdomotaibackVer2/src/routes/invoice.routes.ts`, add before the `export`:

```typescript
router.get('/:id/pdf', InvoiceController.generatePDF);
router.post('/:id/send', InvoiceController.sendByEmail);
```

- [ ] **Step 5: Add sendInvoice email template**

In `crmdomotaibackVer2/src/utils/email.ts`, add to the `emailService` object:

```typescript
    sendInvoice: async (
        to: string, clientName: string, invoiceNumber: string,
        total: number, currency: string, dueDate: string | null,
        orgName: string, pdfBuffer: Buffer
    ): Promise<boolean> => {
        const dueLine = dueDate
            ? `<p style="color:${GRAY_TEXT};font-size:14px;">Payment is due by <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>`
            : '';

        const html = wrapHtml('Invoice', `
            <h2 style="color:${DARK};margin:0 0 8px;">Invoice #${invoiceNumber}</h2>
            <p style="color:${GRAY_TEXT};font-size:15px;">Hello ${clientName},</p>
            <p style="color:${GRAY_TEXT};font-size:14px;">Please find attached your invoice from <strong>${orgName}</strong>.</p>
            <div style="background:${LIGHT_BG};border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
                <div style="font-size:32px;font-weight:700;color:${DARK};">${total.toFixed(2)} ${currency}</div>
                <div style="font-size:13px;color:${GRAY_TEXT};margin-top:4px;">Total Amount Due</div>
            </div>
            ${dueLine}
            <p style="color:${GRAY_TEXT};font-size:13px;">The PDF invoice is attached to this email.</p>
        `);

        try {
            await transporter.sendMail({
                from: FROM,
                to,
                subject: `Invoice #${invoiceNumber} from ${orgName}`,
                html,
                attachments: [{
                    filename: `invoice-${invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                }],
            });
            return true;
        } catch (error) {
            console.error(`Failed to send invoice email to ${to}:`, error);
            return false;
        }
    },
```

- [ ] **Step 6: Add frontend service methods**

In `domotaicrmVer2/src/services/invoice.service.ts`, add to the exported object:

```typescript
  downloadPDF: async (id: string, invoiceNumber: string): Promise<void> => {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  sendByEmail: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/invoices/${id}/send`);
    return data;
  },
```

- [ ] **Step 7: Add PDF/Send buttons to Invoices page**

In `domotaicrmVer2/src/pages/Invoices.tsx`, find the `DropdownMenuContent` for invoice actions (where "Mark Sent", "Mark Paid", "Delete" appear) and add before the Delete item:

```tsx
<DropdownMenuItem onClick={async () => {
  try {
    await invoiceService.downloadPDF(invoice.id, invoice.invoiceNumber);
    toast({ title: 'PDF downloaded' });
  } catch { toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' }); }
}}>
  <FileDown className="mr-2 h-4 w-4" />
  Download PDF
</DropdownMenuItem>
{invoice.status === 'DRAFT' && (
  <DropdownMenuItem onClick={async () => {
    try {
      await invoiceService.sendByEmail(invoice.id);
      toast({ title: 'Invoice sent', description: 'Invoice has been sent by email' });
      fetchInvoices();
    } catch { toast({ title: 'Error', description: 'Failed to send invoice', variant: 'destructive' }); }
  }}>
    <Mail className="mr-2 h-4 w-4" />
    Send by Email
  </DropdownMenuItem>
)}
```

Add `FileDown` and `Mail` to the lucide-react imports at the top of the file.

- [ ] **Step 8: Restart both servers, test PDF download**

```bash
# Restart backend, then in browser go to Invoices page
# Click ... menu on an invoice → Download PDF
# Verify PDF opens with correct Domotai branding and data
```

- [ ] **Step 9: Commit both repos**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/utils/pdf.ts src/controllers/invoice.controller.ts src/routes/invoice.routes.ts src/utils/email.ts package.json package-lock.json
git commit -m "feat: add invoice PDF generation and email sending"

cd c:\Users\David\Documents\GitHub\domotaicrmVer2
git add src/services/invoice.service.ts src/pages/Invoices.tsx
git commit -m "feat: add PDF download and send-by-email buttons for invoices"
```

---

## Task 7: File Upload UI Component + Form Integration

**Files:**
- Create: `domotaicrmVer2/src/components/ui/file-upload.tsx`
- Modify: `domotaicrmVer2/src/components/contacts/ContactForm.tsx`
- Modify: `domotaicrmVer2/src/components/projects/ProjectForm.tsx`

- [ ] **Step 1: Create reusable FileUpload component**

Create `domotaicrmVer2/src/components/ui/file-upload.tsx`:

```tsx
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { mediaService } from '@/services/media.service';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  url: string;
  fileName: string;
  size?: number;
  mimeType?: string;
}

interface FileUploadProps {
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  label?: string;
}

export function FileUpload({ value = [], onChange, maxFiles = 5, accept, label = 'Attachments' }: FileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast({ title: 'Limit reached', description: `Maximum ${maxFiles} files allowed`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      try {
        const result = await mediaService.uploadFile(file);
        newFiles.push({
          url: result.url,
          fileName: result.fileName || file.name,
          size: result.size || file.size,
          mimeType: result.mimeType || file.type,
        });
      } catch {
        toast({ title: 'Upload failed', description: `Failed to upload ${file.name}`, variant: 'destructive' });
      }
    }

    if (newFiles.length > 0) {
      onChange?.([...value, ...newFiles]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange?.(updated);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline flex-1">
                {file.fileName}
              </a>
              {file.size && <Badge variant="outline" className="text-xs shrink-0">{formatSize(file.size)}</Badge>}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleRemove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {value.length < maxFiles && (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate FileUpload into ContactForm**

In `domotaicrmVer2/src/components/contacts/ContactForm.tsx`, add import:

```tsx
import { FileUpload } from '@/components/ui/file-upload';
```

Add a state for files and render the FileUpload component at the bottom of the form (before the submit button):

```tsx
// In state declarations:
const [attachments, setAttachments] = useState<{ url: string; fileName: string; size?: number; mimeType?: string }[]>([]);

// In JSX, before the submit button:
<FileUpload
  value={attachments}
  onChange={setAttachments}
  maxFiles={5}
  label="Attachments"
  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
/>
```

When submitting, include attachments in the form data as file links via the existing `addFileLink` endpoint:

```tsx
// After successful contact creation:
for (const file of attachments) {
  await contactService.addFileLink(contact.id, { url: file.url, name: file.fileName, type: file.mimeType });
}
```

- [ ] **Step 3: Integrate FileUpload into ProjectForm**

Same pattern — add FileUpload to the project form. Store uploaded file URLs to be associated with the project after creation.

- [ ] **Step 4: Test the upload flow**

```bash
# In browser:
# 1. Go to Contacts → Create new contact
# 2. Fill form, click Upload File, select a PDF
# 3. Verify file appears in the list
# 4. Submit form
# 5. Verify file link is saved
```

- [ ] **Step 5: Commit**

```bash
cd c:\Users\David\Documents\GitHub\domotaicrmVer2
git add src/components/ui/file-upload.tsx src/components/contacts/ContactForm.tsx src/components/projects/ProjectForm.tsx
git commit -m "feat: add file upload component and integrate in contact/project forms"
```

---

## Task 8: Improve Error Middleware + Health Check

**Files:**
- Modify: `crmdomotaibackVer2/src/middlewares/error.middleware.ts`
- Modify: `crmdomotaibackVer2/src/app.ts`

- [ ] **Step 1: Improve error middleware**

Replace `crmdomotaibackVer2/src/middlewares/error.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    // Zod validation errors
    if (err instanceof ZodError) {
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return res.status(400).json({ error: 'Validation failed', details: messages });
    }

    // App-specific errors with status codes
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    // Log unexpected errors
    logger.error(`[${req.method} ${req.originalUrl}] ${err.message}\n${err.stack}`);

    // Don't leak stack traces in production
    const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    res.status(500).json({ error: message });
}
```

- [ ] **Step 2: Add health check with DB verification**

In `crmdomotaibackVer2/src/app.ts`, replace the health endpoint:

```typescript
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
    }
});
```

Add the prisma import at the top of app.ts:

```typescript
import { prisma } from './config/prisma';
```

- [ ] **Step 3: Restart and verify**

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","db":"connected","timestamp":"..."}
```

- [ ] **Step 4: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/middlewares/error.middleware.ts src/app.ts
git commit -m "feat: improve error handling and add DB health check"
```

---

## Execution Order

Tasks are independent and can be parallelized. Recommended grouping:

**Batch 1 (Security Foundation):** Tasks 1, 2, 8 — can run in parallel
**Batch 2 (Backend Services):** Tasks 3, 4, 5 — can run in parallel (all touch different controller methods)
**Batch 3 (Features):** Tasks 6, 7 — can run in parallel (different files entirely)
