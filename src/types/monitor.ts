export interface ProjectMonitorSummary {
    projectId: string;
    projectName: string;
    hasMonitoring: boolean;
    productionUrl: string | null;
    isUp: boolean | null;
    lastHeartbeatAt: string | null;
    errorCount24h: number;
}

export interface MonitorStatus {
    isUp: boolean | null;
    uptimePercent: number | null;
    avgResponseTimeMs: number | null;
    errorCount24h: number;
    lastHeartbeat: {
        receivedAt: string;
        payload: Record<string, unknown>;
    } | null;
    lastDeploy: {
        receivedAt: string;
        payload: Record<string, unknown>;
    } | null;
    hasMonitoring: boolean;
    productionUrl: string | null;
}

export interface MonitorEvent {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    receivedAt: string;
}

export interface MonitorHealthCheck {
    id: string;
    statusCode: number | null;
    responseTimeMs: number | null;
    isUp: boolean;
    checkedAt: string;
    errorMessage: string | null;
}
