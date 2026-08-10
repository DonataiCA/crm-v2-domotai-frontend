export type IncidentSeverity = "MINOR" | "MAJOR" | "CRITICAL";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "MITIGATING" | "RESOLVED" | "CLOSED";
export type IncidentSource = "MANUAL" | "MONITOR" | "ALERT";

export interface IncidentEventDTO {
    id: string;
    incidentId: string;
    type: string;
    message: string;
    metadata: unknown;
    createdAt: string;
    createdBy: { id: string; fullName: string | null; email: string } | null;
}

export interface IncidentDTO {
    id: string;
    organizationId: string;
    title: string;
    description: string | null;
    severity: IncidentSeverity;
    status: IncidentStatus;
    source: IncidentSource;
    detectedAt: string;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    postmortem: string | null;
    metadata: unknown;
    project: { id: string; name: string; productionUrl: string | null } | null;
    owner: { id: string; fullName: string | null; email: string } | null;
    createdBy: { id: string; fullName: string | null; email: string } | null;
    createdAt: string;
    updatedAt: string;
    eventCount: number;
    events: IncidentEventDTO[];
}

export interface IncidentSummary {
    open: number;
    meanTimeToResolveMinutes: number | null;
    window: string;
}

export interface CreateIncidentPayload {
    title: string;
    description?: string | null;
    severity?: IncidentSeverity;
    projectId?: string | null;
    ownerId?: string | null;
    metadata?: Record<string, unknown>;
}

export interface UpdateIncidentPayload {
    title?: string;
    description?: string | null;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    ownerId?: string | null;
    postmortem?: string | null;
}

export interface AddIncidentEventPayload {
    type:
        | "NOTE"
        | "ACKNOWLEDGED"
        | "MITIGATED"
        | "RESOLVED"
        | "CLOSED"
        | "REOPENED"
        | "STATUS_CHANGED"
        | "OWNER_CHANGED";
    message: string;
    metadata?: Record<string, unknown>;
}
