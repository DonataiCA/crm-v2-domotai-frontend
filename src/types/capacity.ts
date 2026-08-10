export type CapacityBucket = "available" | "healthy" | "tight" | "overloaded";

export interface CapacityRow {
    userId: string;
    fullName: string | null;
    email: string;
    role: string;
    openTaskCount: number;
    overdueTaskCount: number;
    plannedHours: number;
    availableHours: number;
    utilizationPercent: number;
    loggedHoursWeek: number;
    activeProjectCount: number;
    bucket: CapacityBucket;
}

export interface CapacityWeekResponse {
    weekStart: string;
    weekEnd: string;
    hoursPerDay: number;
    workDays: number;
    rows: CapacityRow[];
    totals: {
        members: number;
        overloaded: number;
        tight: number;
        available: number;
    };
}

export interface ProjectTaskBreakdown {
    projectId: string;
    projectName: string;
    openCount: number;
    overdueCount: number;
}

export interface UpcomingTaskRef {
    id: string;
    title: string;
    dueDate: string | null;
    priority: string | null;
    projectId: string;
    projectName: string | null;
}

export interface WorkloadDetailResponse {
    userId: string;
    projectLeadCount: number;
    tasksByProject: ProjectTaskBreakdown[];
    upcomingTasks: UpcomingTaskRef[];
}
