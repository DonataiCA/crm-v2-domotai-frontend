# Wave 1 — Day 1 Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CRM production-ready for the Domotai commercial team's first day of operations — fix error handling, secure user creation, add email notifications for leads, persist timers, add DB indexes, and lock down validators.

**Architecture:** Backend is Express + Prisma + PostgreSQL. Frontend is React 18 + Vite + Tailwind + shadcn/ui. Both deployed to EC2 via scp + PM2. Changes are additive — no breaking modifications to existing APIs.

**Tech Stack:** TypeScript, Prisma 6, Zod, Axios, nodemailer, React Query

---

### Task 1: Axios Error Interceptor (403 / 5xx / timeout)

**Files:**
- Modify: `domotaicrmVer2/src/lib/api-client.ts`

- [ ] **Step 1: Add error handling to the response interceptor**

Replace the existing error interceptor (lines 59-71) with:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('[API] Request timeout');
    }

    const status = error.response?.status;

    if (status === 401) {
      clearToken();
      clearOrganizationId();
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth';
      }
    }

    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: Add request timeout default**

After the `apiClient` creation (line 38), add timeout:

```typescript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit` — expected: no errors

---

### Task 2: Error States on Frontend Pages

**Files:**
- Modify: `domotaicrmVer2/src/pages/Calendar.tsx`
- Modify: `domotaicrmVer2/src/pages/Invoices.tsx`
- Modify: `domotaicrmVer2/src/pages/TimeTracking.tsx`
- Modify: `domotaicrmVer2/src/pages/Capacity.tsx`
- Modify: `domotaicrmVer2/src/pages/Incidents.tsx`

For each page, the pattern is:

- [ ] **Step 1: Add `error` to useQuery destructuring**

Find the `useQuery` call and add `error` to the destructured result:

```typescript
const { data, isLoading, error } = useQuery({...});
```

- [ ] **Step 2: Add error UI after the loading state**

After the existing `isLoading` check, add:

```tsx
if (error) {
  return (
    <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-destructive/10">
      <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
      <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
      <Button onClick={() => queryClient.invalidateQueries()}>Retry</Button>
    </div>
  );
}
```

- [ ] **Step 3: Repeat for all 5 pages**

Apply the same pattern to Calendar, Invoices, TimeTracking, Capacity, Incidents.

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit` — expected: no errors

---

### Task 3: Secure admin-create Endpoint

**Files:**
- Modify: `crmdomotaibackVer2/src/controllers/user.controller.ts`

- [ ] **Step 1: Add role check at the top of adminCreate method**

After the `x-organization-id` check, add:

```typescript
const userProfileId = (req as any).user?.profileId;
if (userProfileId) {
    const requesterProfile = await prisma.profile.findUnique({
        where: { id: userProfileId },
        select: { role: true },
    });
    if (!requesterProfile || !['admin', 'salesman'].includes(requesterProfile.role)) {
        return sendError(res, 403, 'Only admins and salesmen can create users');
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit` — expected: no errors

---

### Task 4: Lead Notification Emails

**Files:**
- Modify: `crmdomotaibackVer2/src/controllers/lead.controller.ts` — add notifications to update
- Modify: `crmdomotaibackVer2/src/utils/notify.ts` — add LEAD_ASSIGNED and LEAD_STAGE_CHANGE cases
- Modify: `crmdomotaibackVer2/src/utils/email.ts` — add sendLeadAssigned and sendLeadStageChange templates

- [ ] **Step 1: Add email templates to email.ts**

After the `sendNewComment` method, add:

```typescript
sendLeadAssigned: async (
    to: string, assigneeName: string, leadName: string, assignedBy: string
) => {
    const html = wrapHtml('Lead Assigned', `
        <h2 style="color:${DARK};margin:0 0 8px;">New Lead Assigned</h2>
        <p style="color:${GRAY_TEXT};">Hi ${assigneeName},</p>
        <p style="color:${GRAY_TEXT};">You have been assigned a new lead:</p>
        <div style="background:${LIGHT_BG};border-radius:8px;padding:16px;margin:16px 0;">
            <p style="font-size:18px;font-weight:600;color:${DARK};margin:0;">${leadName}</p>
        </div>
        <p style="color:${GRAY_TEXT};font-size:13px;">Assigned by ${assignedBy}</p>
    `);
    await transporter.sendMail({ from: FROM, to, subject: `Lead assigned: ${leadName}`, html });
},

sendLeadStageChange: async (
    to: string, assigneeName: string, leadName: string, oldStage: string, newStage: string
) => {
    const html = wrapHtml('Lead Stage Updated', `
        <h2 style="color:${DARK};margin:0 0 8px;">Lead Stage Changed</h2>
        <p style="color:${GRAY_TEXT};">Hi ${assigneeName},</p>
        <p style="color:${GRAY_TEXT};">A lead you're managing has moved stages:</p>
        <div style="background:${LIGHT_BG};border-radius:8px;padding:16px;margin:16px 0;">
            <p style="font-size:18px;font-weight:600;color:${DARK};margin:0;">${leadName}</p>
            <p style="color:${GRAY_TEXT};margin:8px 0 0;font-size:14px;">
                <span style="text-decoration:line-through;">${oldStage}</span>
                &nbsp;&rarr;&nbsp;
                <strong style="color:${BLUE};">${newStage}</strong>
            </p>
        </div>
    `);
    await transporter.sendMail({ from: FROM, to, subject: `Lead moved to ${newStage}: ${leadName}`, html });
},
```

- [ ] **Step 2: Add notification cases to notify.ts**

In the `sendEmailForType` switch, add before `default`:

```typescript
case 'LEAD_ASSIGNED':
    await emailService.sendLeadAssigned(
        params.recipientEmail,
        (meta.assigneeName as string) || 'Team member',
        (meta.leadName as string) || params.title,
        (meta.assignedBy as string) || 'Someone'
    );
    break;
case 'LEAD_STAGE_CHANGE':
    await emailService.sendLeadStageChange(
        params.recipientEmail,
        (meta.assigneeName as string) || 'Team member',
        (meta.leadName as string) || params.title,
        (meta.oldStage as string) || '',
        (meta.newStage as string) || ''
    );
    break;
```

- [ ] **Step 3: Add notifications to lead update controller**

In `LeadController.update`, after `await logAudit(...)`, add:

```typescript
// Notify on assignment change
if (req.body.assignedTo && req.body.assignedTo !== existing.assignedTo) {
    const actor = await prisma.profile.findUnique({ where: { id: (req as any).userId }, select: { fullName: true } });
    await notify({
        organizationId: existing.organizationId,
        type: 'LEAD_ASSIGNED',
        title: `Lead assigned: ${lead.name}`,
        entityType: 'Lead',
        entityId: lead.id,
        actorId: (req as any).userId,
        recipientUserId: req.body.assignedTo,
        metadata: { leadName: lead.name, assignedBy: actor?.fullName || 'Someone', assigneeName: '' },
    });
}

// Notify on stage change
if (req.body.stage && req.body.stage !== existing.stage && existing.assignedTo) {
    await notify({
        organizationId: existing.organizationId,
        type: 'LEAD_STAGE_CHANGE',
        title: `Lead moved to ${req.body.stage}: ${lead.name}`,
        entityType: 'Lead',
        entityId: lead.id,
        actorId: (req as any).userId,
        recipientUserId: existing.assignedTo,
        metadata: { leadName: lead.name, oldStage: existing.stage, newStage: req.body.stage, assigneeName: '' },
    });
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit` — expected: no errors

---

### Task 5: Persistent Time Tracking Timer

**Files:**
- Modify: `domotaicrmVer2/src/pages/TimeTracking.tsx`

- [ ] **Step 1: Read the file and find the timer state**

Find the timer start/stop logic. Add localStorage persistence.

- [ ] **Step 2: Save timer to localStorage on start**

When the timer starts, save:
```typescript
localStorage.setItem('domotai_active_timer', JSON.stringify({
  startTime: new Date().toISOString(),
  projectId,
  taskId,
  description,
}));
```

- [ ] **Step 3: Restore timer on page load**

On component mount, check:
```typescript
useEffect(() => {
  const saved = localStorage.getItem('domotai_active_timer');
  if (saved) {
    const timer = JSON.parse(saved);
    // Restore timer state from saved data
    setIsRunning(true);
    setStartTime(new Date(timer.startTime));
    // ... restore other fields
  }
}, []);
```

- [ ] **Step 4: Clear localStorage on timer stop**

When timer stops:
```typescript
localStorage.removeItem('domotai_active_timer');
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit` — expected: no errors

---

### Task 6: Database Performance Indexes

**Files:**
- Modify: `crmdomotaibackVer2/prisma/schema.prisma`

- [ ] **Step 1: Add indexes to Lead model**

After `@@map("leads")`, add:
```prisma
@@index([organizationId, stage])
@@index([pipelineId])
```

- [ ] **Step 2: Add index to Task model**

After `@@map("tasks")`, add:
```prisma
@@index([organizationId, status])
```

- [ ] **Step 3: Add index to Contact model**

After `@@map("contacts")`, add:
```prisma
@@index([organizationId, deletedAt])
```

- [ ] **Step 4: Add index to ProjectTask model**

After `@@map("project_tasks")`, add:
```prisma
@@index([projectId, status])
```

- [ ] **Step 5: Run migration**

Run: `npx prisma migrate dev --name add_performance_indexes`

---

### Task 7: Strict Validators

**Files:**
- Modify: `crmdomotaibackVer2/src/validators/lead.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/contact.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/company.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/task.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/project.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/portal.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/calendar.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/invoice.validator.ts`
- Modify: `crmdomotaibackVer2/src/validators/organization.validator.ts`

- [ ] **Step 1: Replace all `.passthrough()` with `.strip()`**

In every validator file listed above, find `.passthrough()` and replace with `.strip()`. Using `.strip()` instead of `.strict()` because `.strict()` throws errors on extra fields — `.strip()` silently removes them, which is safer for backwards compatibility.

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit` — expected: no errors

- [ ] **Step 3: Test that existing create/update flows still work**

Verify lead create, contact create, task create all still pass validation.

---

### Task 8: Build + Deploy

- [ ] **Step 1: Build backend**

Run: `cd crmdomotaibackVer2 && npm run build`

- [ ] **Step 2: Build frontend**

Run: `cd domotaicrmVer2 && VITE_API_URL=https://crm.domotaitech.com/api npx vite build`

- [ ] **Step 3: Upload and deploy both to EC2**

Upload via scp, copy to /opt/domotai, run prisma migrate deploy, pm2 reload, chmod frontend.

- [ ] **Step 4: Verify health**

Run: `curl https://crm.domotaitech.com/api/health` — expected: `{"status":"ok","db":"connected"}`
