# CRM HubSpot-Style Restructuring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the commercial CRM to follow HubSpot's entity model — Company as a first-class entity, leads assigned to companies, multiple pipelines with custom stages, master detail pages, multi-entity tasks, commercial/operational dashboards, investor role, and AI commercial agent.

**Architecture:** Backend adds Company model and updates Lead/Task relations via Prisma migrations. Frontend adds Company CRUD pages, entity detail pages, enhanced pipeline management, and two dashboard tabs. Backward-compatible — existing data migrated, no breaking changes.

**Tech Stack:** Express.js, Prisma 6, PostgreSQL, React 18, TypeScript, shadcn/ui, Recharts, OpenAI

---

## Phase 1: Data Model + Company Entity (Backend)

### Task 1: Prisma Schema — Company model + relation updates

**Files:**
- Modify: `crmdomotaibackVer2/prisma/schema.prisma`

- [ ] **Step 1: Add Company model to schema.prisma**

Add after the Contact model section:

```prisma
// ─── COMPANY ────────────────────────────────────────────────────────────────

model Company {
  id             String    @id @default(uuid())
  name           String
  domain         String?
  industry       String?
  size           String?
  website        String?
  phone          String?
  address        String?
  notes          String?
  assignedTo     String?
  createdBy      String?
  organizationId String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  assignee     Profile?     @relation("CompanyAssignee", fields: [assignedTo], references: [id], onDelete: SetNull)
  creator      Profile?     @relation("CompanyCreatedBy", fields: [createdBy], references: [id], onDelete: SetNull)

  contacts     Contact[]
  leads        Lead[]
  tasks        Task[]       @relation("TaskCompany")

  @@map("companies")
}
```

- [ ] **Step 2: Add companyId to Contact model**

Add to the Contact model fields:

```prisma
  companyId      String?
```

Add to the Contact relations:

```prisma
  companyRef     Company?     @relation(fields: [companyId], references: [id], onDelete: SetNull)
```

- [ ] **Step 3: Add companyId to Lead model**

Add to the Lead model fields:

```prisma
  companyId      String?
```

Add to the Lead relations:

```prisma
  company        Company?     @relation(fields: [companyId], references: [id], onDelete: SetNull)
```

- [ ] **Step 4: Add companyId to Task model**

Add to the Task model fields:

```prisma
  companyId      String?
```

Add to the Task relations:

```prisma
  company        Company?     @relation("TaskCompany", fields: [companyId], references: [id], onDelete: SetNull)
```

- [ ] **Step 5: Add Company relations to Profile model**

Add to Profile model relations:

```prisma
  assignedCompanies  Company[] @relation("CompanyAssignee")
  createdCompanies   Company[] @relation("CompanyCreatedBy")
```

- [ ] **Step 6: Add Company relation to Organization model**

Add to Organization model relations:

```prisma
  companies    Company[]
```

- [ ] **Step 7: Run migration**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
npx prisma migrate dev --name add_company_model
```

- [ ] **Step 8: Create migration script to extract existing company strings to Company records**

Create `crmdomotaibackVer2/prisma/seeders/migrate-companies.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Get all unique company names from contacts, grouped by organization
    const contacts = await prisma.contact.findMany({
        where: { company: { not: null }, deletedAt: null },
        select: { id: true, company: true, organizationId: true },
    });

    const companyMap = new Map<string, string>(); // "orgId::companyName" → companyId

    for (const contact of contacts) {
        if (!contact.company?.trim()) continue;

        const key = `${contact.organizationId}::${contact.company.trim()}`;
        
        if (!companyMap.has(key)) {
            const existing = await prisma.company.findFirst({
                where: { name: contact.company.trim(), organizationId: contact.organizationId },
            });

            if (existing) {
                companyMap.set(key, existing.id);
            } else {
                const company = await prisma.company.create({
                    data: {
                        name: contact.company.trim(),
                        organizationId: contact.organizationId,
                    },
                });
                companyMap.set(key, company.id);
                console.log(`Created company: ${company.name}`);
            }
        }

        // Update contact with companyId
        await prisma.contact.update({
            where: { id: contact.id },
            data: { companyId: companyMap.get(key) },
        });
    }

    console.log(`Migrated ${companyMap.size} companies from ${contacts.length} contacts`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
```

- [ ] **Step 9: Run migration script**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
npx ts-node --transpile-only prisma/seeders/migrate-companies.ts
```

- [ ] **Step 10: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add prisma/
git commit -m "feat: add Company model, update Contact/Lead/Task with companyId"
```

---

### Task 2: Company Backend CRUD (Controller + Repository + Routes)

**Files:**
- Create: `crmdomotaibackVer2/src/repositories/company.repository.ts`
- Create: `crmdomotaibackVer2/src/controllers/company.controller.ts`
- Create: `crmdomotaibackVer2/src/routes/company.routes.ts`
- Create: `crmdomotaibackVer2/src/validators/company.validator.ts`
- Modify: `crmdomotaibackVer2/src/app.ts`

- [ ] **Step 1: Create company repository**

Create `crmdomotaibackVer2/src/repositories/company.repository.ts`:

```typescript
import { prisma } from '../config/prisma';

const companyIncludes = {
    assignee: { select: { id: true, fullName: true, email: true } },
    creator: { select: { id: true, fullName: true, email: true } },
    _count: { select: { contacts: true, leads: true, tasks: true } },
};

export const CompanyRepository = {
    findAll: (orgId: string, skip: number, take: number, filters?: { search?: string }) => {
        const where: any = { organizationId: orgId, deletedAt: null };
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { domain: { contains: filters.search, mode: 'insensitive' } },
                { industry: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        return prisma.company.findMany({ where, skip, take, include: companyIncludes, orderBy: { name: 'asc' } });
    },

    count: (orgId: string, filters?: { search?: string }) => {
        const where: any = { organizationId: orgId, deletedAt: null };
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { domain: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        return prisma.company.count({ where });
    },

    findById: (id: string) =>
        prisma.company.findUnique({
            where: { id },
            include: {
                ...companyIncludes,
                contacts: {
                    where: { deletedAt: null },
                    select: { id: true, name: true, email: true, phone: true, category: true },
                    take: 50,
                },
                leads: {
                    select: { id: true, name: true, stage: true, price: true, assignedTo: true, createdAt: true,
                        assignee: { select: { id: true, fullName: true } },
                    },
                    take: 50,
                },
                tasks: {
                    where: { status: { not: 'COMPLETED' } },
                    select: { id: true, title: true, status: true, priority: true, dueDate: true,
                        assignee: { select: { id: true, fullName: true } },
                    },
                    orderBy: { dueDate: 'asc' },
                    take: 50,
                },
            },
        }),

    create: (data: {
        name: string; domain?: string; industry?: string; size?: string;
        website?: string; phone?: string; address?: string; notes?: string;
        assignedTo?: string; createdBy?: string; organizationId: string;
    }) => prisma.company.create({ data, include: companyIncludes }),

    update: (id: string, data: Record<string, unknown>) =>
        prisma.company.update({ where: { id }, data, include: companyIncludes }),

    softDelete: (id: string) =>
        prisma.company.update({ where: { id }, data: { deletedAt: new Date() } }),
};
```

- [ ] **Step 2: Create company validator**

Create `crmdomotaibackVer2/src/validators/company.validator.ts`:

```typescript
import { z } from 'zod';

export const createCompanySchema = z.object({
    name: z.string().min(1, 'Company name is required').max(200),
    domain: z.string().max(200).optional().nullable(),
    industry: z.string().max(100).optional().nullable(),
    size: z.string().max(50).optional().nullable(),
    website: z.string().url().optional().nullable().or(z.literal('')),
    phone: z.string().max(30).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
}).passthrough();

export const updateCompanySchema = createCompanySchema.partial();
```

- [ ] **Step 3: Create company controller**

Create `crmdomotaibackVer2/src/controllers/company.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { sendError } from '../utils/error';
import { CompanyRepository } from '../repositories/company.repository';
import { logAudit } from '../utils/audit';

export const CompanyController = {
    index: async (req: Request, res: Response) => {
        try {
            const organizationId = req.headers['x-organization-id'] as string;
            if (!organizationId) return sendError(res, 400, 'x-organization-id header is required');

            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 20));
            const skip = (page - 1) * limit;
            const search = req.query.search as string | undefined;

            const [data, total] = await Promise.all([
                CompanyRepository.findAll(organizationId, skip, limit, { search }),
                CompanyRepository.count(organizationId, { search }),
            ]);

            res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
        } catch (error) {
            return sendError(res, 500, 'Failed to fetch companies', error);
        }
    },

    show: async (req: Request, res: Response) => {
        try {
            const company = await CompanyRepository.findById(req.params.id);
            if (!company) return sendError(res, 404, 'Company not found');
            res.json(company);
        } catch (error) {
            return sendError(res, 500, 'Failed to fetch company', error);
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const organizationId = req.headers['x-organization-id'] as string;
            if (!organizationId) return sendError(res, 400, 'x-organization-id header is required');

            const company = await CompanyRepository.create({
                ...req.body,
                organizationId,
                createdBy: (req as any).userId,
            });

            res.status(201).json(company);
            await logAudit(req, { action: 'CREATE', entityType: 'Company', entityId: company.id, entityName: company.name });
        } catch (error) {
            return sendError(res, 500, 'Failed to create company', error);
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const existing = await CompanyRepository.findById(req.params.id);
            if (!existing) return sendError(res, 404, 'Company not found');

            const updated = await CompanyRepository.update(req.params.id, req.body);
            res.json(updated);
            await logAudit(req, { action: 'UPDATE', entityType: 'Company', entityId: req.params.id });
        } catch (error) {
            return sendError(res, 500, 'Failed to update company', error);
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const existing = await CompanyRepository.findById(req.params.id);
            if (!existing) return sendError(res, 404, 'Company not found');

            await CompanyRepository.softDelete(req.params.id);
            res.sendStatus(204);
            await logAudit(req, { action: 'DELETE', entityType: 'Company', entityId: req.params.id, entityName: existing.name });
        } catch (error) {
            return sendError(res, 500, 'Failed to delete company', error);
        }
    },
};
```

- [ ] **Step 4: Create company routes**

Create `crmdomotaibackVer2/src/routes/company.routes.ts`:

```typescript
import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';

const router = Router();
router.use(authenticate);

router.get('/', CompanyController.index);
router.post('/', validate(createCompanySchema), CompanyController.create);
router.get('/:id', CompanyController.show);
router.put('/:id', validate(updateCompanySchema), CompanyController.update);
router.delete('/:id', CompanyController.delete);

export default router;
```

- [ ] **Step 5: Register company routes in app.ts**

In `crmdomotaibackVer2/src/app.ts`, add import and route:

```typescript
import companyRoutes from './routes/company.routes';
// ...
app.use('/companies', companyRoutes);
```

- [ ] **Step 6: Update Lead repository to include company**

In the lead repository, update the `leadIncludes` to add:

```typescript
company: { select: { id: true, name: true, domain: true } },
```

- [ ] **Step 7: Update Contact repository to include company**

In the contact repository, update includes to add:

```typescript
companyRef: { select: { id: true, name: true } },
```

- [ ] **Step 8: Update Task repository to include company**

In the task repository, update includes to add:

```typescript
company: { select: { id: true, name: true } },
```

- [ ] **Step 9: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/repositories/company.repository.ts src/controllers/company.controller.ts src/routes/company.routes.ts src/validators/company.validator.ts src/app.ts src/repositories/
git commit -m "feat: add Company CRUD backend with repository, controller, routes, validator"
```

---

## Phase 2: Frontend — Company Entity + Updated Types

### Task 3: Frontend Types + Service + Company Pages

**Files:**
- Modify: `domotaicrmVer2/src/types/api.ts`
- Create: `domotaicrmVer2/src/services/company.service.ts`
- Create: `domotaicrmVer2/src/pages/Companies.tsx`
- Create: `domotaicrmVer2/src/components/companies/CompanyForm.tsx`
- Create: `domotaicrmVer2/src/components/companies/CompanyList.tsx`
- Modify: `domotaicrmVer2/src/App.tsx`
- Modify: `domotaicrmVer2/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add Company types to api.ts**

```typescript
export interface CompanyRef {
  id: string;
  name: string;
  domain?: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  assignedTo: UserRef | null;
  createdBy: UserRef | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { contacts: number; leads: number; tasks: number };
  contacts?: ContactRef[];
  leads?: LeadRef[];
  tasks?: Task[];
}

export interface CompanyPayload {
  name?: string;
  domain?: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  address?: string;
  notes?: string;
  assignedTo?: string;
}
```

Update existing interfaces — add to `Contact`:
```typescript
  companyId?: string | null;
  companyRef?: CompanyRef | null;
```

Add to `Lead`:
```typescript
  companyId?: string | null;
  company?: CompanyRef | null;
```

Add to `Task`:
```typescript
  companyId?: string | null;
  company?: CompanyRef | null;
```

Add to `LeadPayload`:
```typescript
  companyId?: string | null;
```

Add to `ContactPayload`:
```typescript
  companyId?: string | null;
```

Add to `TaskPayload`:
```typescript
  companyId?: string | null;
```

- [ ] **Step 2: Create company service**

Create `domotaicrmVer2/src/services/company.service.ts`:

```typescript
import api from '@/lib/api-client';
import type { Company, CompanyPayload, PaginatedResponse } from '@/types/api';

export const companyService = {
  getCompanies: async (page = 1, limit = 20, filters?: { search?: string }): Promise<PaginatedResponse<Company>> => {
    const params: Record<string, unknown> = { page, limit };
    if (filters?.search) params.search = filters.search;
    const { data } = await api.get<PaginatedResponse<Company>>('/companies', { params });
    return data;
  },

  getCompany: async (id: string): Promise<Company> => {
    const { data } = await api.get<Company>(`/companies/${id}`);
    return data;
  },

  createCompany: async (payload: CompanyPayload): Promise<Company> => {
    const { data } = await api.post<Company>('/companies', payload);
    return data;
  },

  updateCompany: async (id: string, payload: CompanyPayload): Promise<Company> => {
    const { data } = await api.put<Company>(`/companies/${id}`, payload);
    return data;
  },

  deleteCompany: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },
};
```

- [ ] **Step 3: Create CompanyForm component**

Create `domotaicrmVer2/src/components/companies/CompanyForm.tsx` — a form with fields: name (required), domain, industry (select: Technology, Finance, Healthcare, Education, Real Estate, Retail, Other), size (select: Startup, Small, Medium, Large, Enterprise), website, phone, address, notes, assignedTo (UserSelector). Follow the same pattern as ContactForm — useForm with zodResolver, onSuccess callback.

- [ ] **Step 4: Create CompanyList component**

Create `domotaicrmVer2/src/components/companies/CompanyList.tsx` — a data table with columns: Name, Industry, Size, Contacts (count), Leads (count), Assigned To, Actions (edit/delete). Include search input and pagination. Follow ContactList patterns.

- [ ] **Step 5: Create Companies page**

Create `domotaicrmVer2/src/pages/Companies.tsx` — page that renders CompanyList + "New Company" dialog with CompanyForm. Same structure as Contacts page.

- [ ] **Step 6: Add route and sidebar item**

In `App.tsx`, add route:
```tsx
<Route path="/companies" element={<TeamOnly><Companies /></TeamOnly>} />
```

In `Sidebar.tsx`, add to navItems after Contacts:
```typescript
{ icon: Building2, label: "Companies", path: "/companies" },
```

Import `Building2` from lucide-react.

- [ ] **Step 7: Commit**

```bash
cd c:\Users\David\Documents\GitHub\domotaicrmVer2
git add src/types/api.ts src/services/company.service.ts src/pages/Companies.tsx src/components/companies/ src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add Company entity - types, service, CRUD pages, sidebar nav"
```

---

### Task 4: Entity Detail Pages (Company, Contact, Lead)

**Files:**
- Create: `domotaicrmVer2/src/pages/CompanyDetail.tsx`
- Create: `domotaicrmVer2/src/pages/ContactDetail.tsx`
- Create: `domotaicrmVer2/src/pages/LeadDetail.tsx`
- Create: `domotaicrmVer2/src/components/entities/EntityTaskList.tsx`
- Create: `domotaicrmVer2/src/components/entities/EntityTimeline.tsx`
- Modify: `domotaicrmVer2/src/App.tsx`

Each detail page follows the same layout pattern:

```
┌─────────────────────────────────────────┐
│ ← Back   Entity Name          [Edit]    │
├──────────────────┬──────────────────────┤
│ Info Card        │ Related Entities     │
│ - Fields         │ - Contacts (company) │
│ - Assigned To    │ - Leads (company/ct) │
│ - Created        │ - Tasks              │
│                  │ - Notes/Events       │
├──────────────────┴──────────────────────┤
│ Tabs: Tasks | Notes/Events | Timeline   │
└─────────────────────────────────────────┘
```

- [ ] **Step 1: Create EntityTaskList component**

Create `domotaicrmVer2/src/components/entities/EntityTaskList.tsx` — a reusable component that shows tasks for any entity. Props: `entityType: 'company'|'contact'|'lead'`, `entityId: string`. Queries tasks filtered by the entity. Shows task list with status, priority, due date, assignee. Has "Add Task" button that creates a task pre-linked to the entity.

- [ ] **Step 2: Create EntityTimeline component**

Create `domotaicrmVer2/src/components/entities/EntityTimeline.tsx` — shows a timeline of events/notes. Props: `events: LeadEvent[]`, `onAddEvent: (type, description) => void`. Renders chronologically with event type badges.

- [ ] **Step 3: Create CompanyDetail page**

Create `domotaicrmVer2/src/pages/CompanyDetail.tsx`:
- Queries `companyService.getCompany(id)` — returns company with contacts, leads, tasks
- Left panel: company info (name, domain, industry, size, website, phone, address, notes, assigned to)
- Right panel: stats cards (contacts count, leads count, active tasks)
- Tabs: 
  - Contacts — list with link to contact detail
  - Leads — list with stage badges, amounts
  - Tasks — EntityTaskList component
  - Notes — text area to add notes (stored in company.notes)

- [ ] **Step 4: Create ContactDetail page**

Create `domotaicrmVer2/src/pages/ContactDetail.tsx`:
- Queries `contactService.getContact(id)` — add includes for tasks, leads
- Left: contact info + company link (clickable → company detail)
- Tabs:
  - Tasks — EntityTaskList for this contact
  - Notes — existing ContactNote system
  - Files — existing FileLink system
  - Leads — leads where contactId matches

- [ ] **Step 5: Create LeadDetail page**

Create `domotaicrmVer2/src/pages/LeadDetail.tsx`:
- Queries `leadService.getLead(id)` — returns lead with events, stage history
- Left: lead info (name, stage badge, price, company link, contact link, assigned to, pipeline)
- Tabs:
  - Tasks — EntityTaskList for this lead
  - Events/Notes — existing LeadEvent system with EntityTimeline
  - Stage History — timeline of stage changes

- [ ] **Step 6: Add routes**

In `App.tsx`:
```tsx
<Route path="/companies/:id" element={<TeamOnly><CompanyDetail /></TeamOnly>} />
<Route path="/contacts/:id" element={<TeamOnly><ContactDetail /></TeamOnly>} />
<Route path="/leads/:id" element={<TeamOnly><LeadDetail /></TeamOnly>} />
```

- [ ] **Step 7: Update list pages to link to detail pages**

In CompanyList, ContactList, and LeadBoard — make entity names clickable links using `useNavigate` to `/companies/:id`, `/contacts/:id`, `/leads/:id`.

- [ ] **Step 8: Commit**

```bash
cd c:\Users\David\Documents\GitHub\domotaicrmVer2
git add src/pages/CompanyDetail.tsx src/pages/ContactDetail.tsx src/pages/LeadDetail.tsx src/components/entities/ src/App.tsx
git commit -m "feat: add master detail pages for Company, Contact, Lead with tabs"
```

---

## Phase 3: Pipeline Management + Multi-Pipeline Support

### Task 5: Enhanced Pipeline & Stage Management UI

**Files:**
- Modify: `domotaicrmVer2/src/pages/Leads.tsx`
- Modify: `domotaicrmVer2/src/components/leads/PipelineManager.tsx` (or create if missing)

The backend already supports multiple pipelines and stage CRUD. The frontend needs:

- [ ] **Step 1: Pipeline selector in Leads page**

Update the Leads page to show a pipeline dropdown/tab selector. When user switches pipeline, the LeadBoard filters by that pipeline. Already partially implemented — enhance the UI:
- Show pipeline name as tabs or dropdown
- Add "Manage Pipelines" button → opens PipelineManagerDialog
- Pipeline manager allows: create pipeline, rename pipeline, delete pipeline
- Stage manager within each pipeline: add stage, edit stage (name + color), delete stage, reorder via drag

- [ ] **Step 2: Pipeline Manager Dialog**

Create or update `PipelineManagerDialog` to:
- List all pipelines on the left
- When pipeline selected, show its stages on the right
- "Add Pipeline" button at bottom of pipeline list
- Per pipeline: rename (inline edit), delete (with confirmation)
- Per stage: add (name + color picker from STAGE_COLORS), edit, delete, drag to reorder
- Reorder calls `pipelineService.reorderStages(pipelineId, stageIds)`
- Preloaded stages like "Closed Abandoned", "Closed Won", "Closed Lost" as suggestions

- [ ] **Step 3: Update LeadForm to show company selector**

Update the lead creation/edit form:
- Add "Company" field (searchable select using companyService.getCompanies)
- Keep Contact field but make it optional
- When company selected, filter contacts to show only contacts from that company

- [ ] **Step 4: Update LeadBoard to show company on cards**

In the lead kanban cards, show company name (if set) below the lead name. Use a `Building2` icon.

- [ ] **Step 5: Commit**

```bash
cd c:\Users\David\Documents\GitHub\domotaicrmVer2
git add src/pages/Leads.tsx src/components/leads/
git commit -m "feat: enhanced pipeline management UI, company on leads, multi-pipeline support"
```

---

## Phase 4: Task Multi-Entity Assignment + Fix Past Tasks

### Task 6: Update Task Forms and Fix Past Tasks Toggle

**Files:**
- Modify: `domotaicrmVer2/src/components/tasks/TaskForm.tsx`
- Modify: `domotaicrmVer2/src/pages/Tasks.tsx`
- Modify: `crmdomotaibackVer2/src/controllers/task.controller.ts`

- [ ] **Step 1: Update TaskForm with multi-entity selectors**

In the task creation/edit form, add three entity selectors:
- Company (searchable select from companyService)
- Contact (searchable select from contactService, filtered by selected company if any)
- Lead (searchable select from leadService)

All are optional. A task can be linked to any combination. The form sends `companyId`, `contactId`, `leadId` as part of the task payload.

- [ ] **Step 2: Fix "hide past tasks" toggle**

In `src/pages/Tasks.tsx`, find the archive/past tasks toggle. The bug is that it doesn't filter correctly. Fix:
- Add state: `hidePastTasks: boolean` (default: false)
- When toggled on, add filter to the query: `status: 'COMPLETED'` should be excluded
- Or filter client-side: tasks where `status === 'COMPLETED'` AND `completedAt < today` are hidden

- [ ] **Step 3: Update task controller to support company filter**

In `crmdomotaibackVer2/src/controllers/task.controller.ts`, add `companyId` to the query filters in the `index` method:

```typescript
if (req.query.companyId) where.companyId = req.query.companyId;
```

- [ ] **Step 4: Show entity badges on task cards**

In task list/kanban views, show badges for linked entities:
- Company badge (Building2 icon + name)
- Contact badge (User icon + name)
- Lead badge (Target icon + name)

Each badge is clickable → navigates to the entity detail page.

- [ ] **Step 5: Commit**

```bash
cd c:\Users\David\Documents\GitHub\domotaicrmVer2
git add src/components/tasks/ src/pages/Tasks.tsx
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/controllers/task.controller.ts
git commit -m "feat: multi-entity task assignment, fix past tasks toggle"
```

---

## Phase 5: Dashboards + Investor Role

### Task 7: Commercial + Operational Dashboard

**Files:**
- Create: `crmdomotaibackVer2/src/controllers/dashboard.controller.ts`
- Create: `crmdomotaibackVer2/src/routes/dashboard.routes.ts`
- Modify: `crmdomotaibackVer2/src/app.ts`
- Create: `domotaicrmVer2/src/pages/Dashboard.tsx` (replace current)
- Create: `domotaicrmVer2/src/components/dashboard/CommercialDashboard.tsx`
- Create: `domotaicrmVer2/src/components/dashboard/OperationalDashboard.tsx`

- [ ] **Step 1: Create dashboard controller (backend)**

Create `crmdomotaibackVer2/src/controllers/dashboard.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { sendError } from '../utils/error';
import { prisma } from '../config/prisma';

export const DashboardController = {
    commercial: async (req: Request, res: Response) => {
        try {
            const organizationId = req.headers['x-organization-id'] as string;
            if (!organizationId) return sendError(res, 400, 'x-organization-id header is required');

            const pipelineId = req.query.pipelineId as string;

            // Get all pipelines with stages
            const pipelines = await prisma.pipeline.findMany({
                where: { organizationId },
                include: { stages: { orderBy: { order: 'asc' } } },
            });

            const activePipeline = pipelineId
                ? pipelines.find(p => p.id === pipelineId) || pipelines[0]
                : pipelines.find(p => p.isDefault) || pipelines[0];

            if (!activePipeline) {
                return res.json({ pipeline: null, stageStats: [], totals: {} });
            }

            // Get leads for this pipeline
            const leads = await prisma.lead.findMany({
                where: { organizationId, pipelineId: activePipeline.id },
                include: {
                    company: { select: { id: true, name: true } },
                    contact: { select: { id: true, name: true } },
                },
            });

            // Stats per stage
            const stageStats = activePipeline.stages.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage.name);
                const companies = new Set(stageLeads.filter(l => l.companyId).map(l => l.companyId));
                return {
                    stageId: stage.id,
                    stageName: stage.name,
                    stageColor: stage.color,
                    stageOrder: stage.order,
                    leadCount: stageLeads.length,
                    totalAmount: stageLeads.reduce((sum, l) => sum + (Number(l.price) || 0), 0),
                    companyCount: companies.size,
                    companies: stageLeads
                        .filter(l => l.company)
                        .map(l => ({ id: l.company!.id, name: l.company!.name }))
                        .filter((v, i, a) => a.findIndex(c => c.id === v.id) === i),
                };
            });

            // Totals
            const totalLeads = leads.length;
            const closedWon = leads.filter(l => l.converted).length;
            const totalRevenue = leads.filter(l => l.converted).reduce((s, l) => s + (Number(l.price) || 0), 0);
            const closeRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;

            res.json({
                pipeline: { id: activePipeline.id, name: activePipeline.name },
                pipelines: pipelines.map(p => ({ id: p.id, name: p.name })),
                stageStats,
                totals: {
                    totalLeads,
                    closedWon,
                    totalRevenue,
                    closeRate,
                    totalAmount: leads.reduce((s, l) => s + (Number(l.price) || 0), 0),
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Failed to fetch commercial dashboard', error);
        }
    },

    operational: async (req: Request, res: Response) => {
        try {
            const organizationId = req.headers['x-organization-id'] as string;
            if (!organizationId) return sendError(res, 400, 'x-organization-id header is required');

            // Projects by status
            const projects = await prisma.project.findMany({
                where: { organizationId },
                select: {
                    id: true, name: true, status: true, startDate: true, endDate: true,
                    _count: { select: { tasks: true, phases: true } },
                },
            });

            const projectsByStatus: Record<string, number> = {};
            projects.forEach(p => {
                const status = p.status || 'Not Started';
                projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
            });

            // Active project tasks stats
            const activeProjectIds = projects.filter(p => p.status === 'In Progress').map(p => p.id);
            const taskStats = await prisma.projectTask.groupBy({
                by: ['status'],
                where: { projectId: { in: activeProjectIds } },
                _count: true,
            });

            // Blocked/overdue tasks
            const overdueTasks = await prisma.projectTask.count({
                where: {
                    projectId: { in: activeProjectIds },
                    status: { not: 'COMPLETED' },
                    dueDate: { lt: new Date() },
                },
            });

            res.json({
                projects: projects.map(p => ({
                    id: p.id, name: p.name, status: p.status,
                    taskCount: p._count.tasks, phaseCount: p._count.phases,
                    startDate: p.startDate, endDate: p.endDate,
                })),
                projectsByStatus,
                taskStats: taskStats.map(t => ({ status: t.status, count: t._count })),
                overdueTasks,
                totalProjects: projects.length,
                activeProjects: activeProjectIds.length,
            });
        } catch (error) {
            return sendError(res, 500, 'Failed to fetch operational dashboard', error);
        }
    },
};
```

- [ ] **Step 2: Create dashboard routes + register in app.ts**

Create `crmdomotaibackVer2/src/routes/dashboard.routes.ts`:

```typescript
import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/commercial', DashboardController.commercial);
router.get('/operational', DashboardController.operational);

export default router;
```

Register: `app.use('/dashboard', dashboardRoutes);`

- [ ] **Step 3: Create frontend Dashboard page with tabs**

Create `domotaicrmVer2/src/pages/Dashboard.tsx` replacing the current index page:
- Two tabs: "Comercial" and "Operativo"
- CommercialDashboard component: pipeline selector, stage funnel chart (Recharts), stats cards (total leads, close rate, total revenue, closed won), table of leads per stage with company names and amounts
- OperationalDashboard component: projects by status pie chart, active projects table, overdue tasks count card, task status distribution bar chart

- [ ] **Step 4: Add investor role**

Backend — In auth middleware or a new role check, add `viewer` as a valid role.

Frontend — In Sidebar.tsx, add condition: if role is `viewer`, only show Dashboard link. In App.tsx, add route guard for viewer role.

Create an investor user via seed or admin panel with role `viewer`.

- [ ] **Step 5: Commit**

```bash
cd c:\Users\David\Documents\GitHub\crmdomotaibackVer2
git add src/controllers/dashboard.controller.ts src/routes/dashboard.routes.ts src/app.ts
git commit -m "feat: add commercial and operational dashboard endpoints"

cd c:\Users\David\Documents\GitHub\domotaicrmVer2
git add src/pages/Dashboard.tsx src/components/dashboard/
git commit -m "feat: add commercial and operational dashboard with tabs"
```

---

## Phase 6: AI Commercial Agent

### Task 8: Conversational AI Agent for Commercial Operations

**Files:**
- Create: `crmdomotaibackVer2/src/controllers/ai-agent.controller.ts`
- Create: `crmdomotaibackVer2/src/routes/ai-agent.routes.ts`
- Create: `domotaicrmVer2/src/components/ai/CommercialAgent.tsx`
- Modify: `domotaicrmVer2/src/pages/Leads.tsx` or Dashboard

- [ ] **Step 1: Create AI agent backend endpoint**

Create `crmdomotaibackVer2/src/controllers/ai-agent.controller.ts`:

The agent receives a natural language message and CRM context, then responds with actions or information. Uses OpenAI GPT-4o-mini with function calling.

System prompt instructs the AI to:
- Answer questions about leads, contacts, companies, tasks
- Suggest next actions (follow-ups, stage changes)
- Create tasks or events from conversation
- Summarize pipeline status

Endpoint: `POST /ai-agent/chat` with body: `{ message: string, context?: { entityType, entityId } }`

The controller:
1. Loads relevant CRM data based on context (recent leads, pipeline stats, etc.)
2. Sends to OpenAI with system prompt + CRM data + user message
3. Returns assistant response

- [ ] **Step 2: Create frontend CommercialAgent component**

A floating chat widget (bottom-right) or a sidebar panel:
- Chat-style UI with message bubbles
- Input field at bottom
- Can be triggered from any commercial page
- Sends message + current page context to `/ai-agent/chat`
- Displays response with markdown formatting

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add AI commercial agent with chat interface"
```

---

## Execution Order

Tasks have these dependencies:

```
Task 1 (Schema) → Task 2 (Backend CRUD) → Task 3 (Frontend Company)
                                         → Task 4 (Detail Pages)
                                         → Task 5 (Pipeline UI)  [independent]
                                         → Task 6 (Tasks update) [needs Task 3 types]
                                         → Task 7 (Dashboards)   [needs Task 2 for company stats]
                                         → Task 8 (AI Agent)     [independent]
```

**Recommended batches:**
- **Batch 1:** Task 1 (schema + migration) — must be first
- **Batch 2:** Task 2 (backend CRUD) — depends on Task 1
- **Batch 3:** Tasks 3, 5, 8 in parallel (Company frontend, Pipeline UI, AI agent)
- **Batch 4:** Tasks 4, 6 in parallel (Detail pages, Task multi-entity)
- **Batch 5:** Task 7 (Dashboards — needs all data models in place)
