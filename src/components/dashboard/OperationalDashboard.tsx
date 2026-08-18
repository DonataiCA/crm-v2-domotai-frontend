import { useQuery } from "@tanstack/react-query";
import { dashboardService, type OperationalData } from "@/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Link } from "react-router-dom";
import { FolderKanban, Activity, AlertCircle } from "lucide-react";
import { ProjectStatus, normalizeProjectStatus, getProjectStatusLabel } from "@/constants";

// Claves canónicas: las grafías históricas ("active", "In Progress") las colapsa
// `normalizeProjectStatus`, así que ya no hace falta una entrada por variante.
const STATUS_COLORS: Record<string, string> = {
  [ProjectStatus.IN_PROGRESS]: "#4A89B9",
  [ProjectStatus.NOT_STARTED]: "#94a3b8",
  [ProjectStatus.COMPLETED]: "#10b981",
  [ProjectStatus.ON_HOLD]: "#f59e0b",
  [ProjectStatus.ARCHIVED]: "#94a3b8",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#4A89B9",
  IN_REVIEW: "#f59e0b",
  COMPLETED: "#10b981",
  BLOCKED: "#ef4444",
};

const FALLBACK_PIE_COLORS = [
  "#4A89B9",
  "#FF5F00",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

function getStatusColor(status: string): string {
  const canonical = normalizeProjectStatus(status);
  return (canonical && STATUS_COLORS[canonical]) || FALLBACK_PIE_COLORS[0];
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const colorMap: Record<string, string> = {
    [ProjectStatus.IN_PROGRESS]: "bg-blue-100 text-blue-700 border-blue-200",
    [ProjectStatus.NOT_STARTED]: "bg-slate-100 text-slate-600 border-slate-200",
    [ProjectStatus.COMPLETED]: "bg-emerald-100 text-emerald-700 border-emerald-200",
    [ProjectStatus.ON_HOLD]: "bg-amber-100 text-amber-700 border-amber-200",
    [ProjectStatus.ARCHIVED]: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const canonical = normalizeProjectStatus(status) ?? ProjectStatus.NOT_STARTED;
  const cls = colorMap[canonical] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {getProjectStatusLabel(canonical)}
    </span>
  );
}

export function OperationalDashboard() {
  const { currentOrganization } = useOrganization();

  const { data, isLoading, error } = useQuery<OperationalData>({
    queryKey: ["dashboard-operational", currentOrganization?.id],
    queryFn: () => dashboardService.getOperational(),
    enabled: !!currentOrganization,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-destructive">
        Failed to load operational data.
      </div>
    );
  }

  const totalProjects = data?.totalProjects ?? 0;
  const activeProjects = data?.activeProjects ?? 0;
  const overdueTasks = data?.overdueTasks ?? 0;
  const projectsByStatus = data?.projectsByStatus ?? {};
  const taskStats = data?.taskStats ?? [];
  const projects = data?.projects ?? [];

  const pieData = Object.entries(projectsByStatus).map(([status, count], idx) => ({
    name: getProjectStatusLabel(status),
    value: count,
    color: getStatusColor(status) || FALLBACK_PIE_COLORS[idx % FALLBACK_PIE_COLORS.length],
  }));

  const taskBarData = taskStats.map((t) => ({
    name: t.status.replace(/_/g, " "),
    count: t.count,
    color: TASK_STATUS_COLORS[t.status] || "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold text-blue-600">{totalProjects}</p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50">
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-emerald-600">{activeProjects}</p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-50">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overdue Tasks</p>
                <p className={`text-2xl font-bold ${overdueTasks > 0 ? "text-red-600" : "text-slate-600"}`}>
                  {overdueTasks}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${overdueTasks > 0 ? "bg-red-50" : "bg-muted/60"}`}>
                <AlertCircle className={`h-5 w-5 ${overdueTasks > 0 ? "text-red-600" : "text-slate-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by status pie chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Projects by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Projects"]} />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task status bar chart */}
        {taskBarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Task Status (Active Projects)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskBarData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [value, "Tasks"]} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {taskBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Projects table */}
      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-3 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left pb-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right pb-3 font-semibold text-muted-foreground">Tasks</th>
                    <th className="text-right pb-3 font-semibold text-muted-foreground">Phases</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4">
                        <Link
                          to={`/projects/${project.id}/tracking`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="py-3 text-right tabular-nums">{project.taskCount}</td>
                      <td className="py-3 text-right tabular-nums">{project.phaseCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 && !isLoading && (
        <div className="py-12 text-center text-muted-foreground">
          No projects found for this organization.
        </div>
      )}
    </div>
  );
}
