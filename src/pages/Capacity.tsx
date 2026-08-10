import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addWeeks, startOfISOWeek, parseISO, isValid } from "date-fns";
import { ChevronLeft, ChevronRight, Users, AlertTriangle, Activity, CheckCircle2, ChevronDown, FolderKanban, Clock, Crown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import { capacityService } from "@/services/capacity.service";
import type { CapacityBucket, CapacityRow } from "@/types/capacity";
import { cn } from "@/lib/utils";

const BUCKET_STYLES: Record<CapacityBucket, { label: string; className: string; barClass: string }> = {
    available: { label: "Disponible", className: "text-emerald-600 bg-emerald-50", barClass: "bg-emerald-500" },
    healthy: { label: "Sano", className: "text-blue-600 bg-blue-50", barClass: "bg-blue-500" },
    tight: { label: "Ajustado", className: "text-amber-600 bg-amber-50", barClass: "bg-amber-500" },
    overloaded: { label: "Sobrecargado", className: "text-red-600 bg-red-50", barClass: "bg-red-500" },
};

const PRIORITY_COLORS: Record<string, string> = {
    HIGH: "bg-red-500/15 text-red-700 border-red-300",
    MEDIUM: "bg-amber-500/15 text-amber-700 border-amber-300",
    LOW: "bg-blue-500/15 text-blue-700 border-blue-300",
};

function getInitials(name: string | null, email: string): string {
    const source = name?.trim() || email;
    return source
        .split(/\s|@/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() || "")
        .join("");
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    const d = parseISO(dateStr);
    if (!isValid(d)) return "-";
    return format(d, "MMM d");
}

function WorkloadDetail({ userId }: { userId: string }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["workload-detail", userId],
        queryFn: () => capacityService.getWorkloadDetail(userId),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (error) {
        return (
            <p className="text-xs text-destructive py-3">
                No se pudo cargar el detalle: {(error as Error).message}
            </p>
        );
    }
    if (!data) return null;

    return (
        <div className="bg-muted/30 rounded-md p-4 mt-2 space-y-4">
            {/* Project breakdown */}
            <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <FolderKanban className="h-3.5 w-3.5" />
                    Tareas por proyecto
                    {data.projectLeadCount > 0 && (
                        <Badge variant="outline" className="ml-2 gap-1 text-[10px] py-0">
                            <Crown className="h-3 w-3" /> Lead en {data.projectLeadCount}
                        </Badge>
                    )}
                </div>
                {data.tasksByProject.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sin tareas asignadas en proyectos.</p>
                ) : (
                    <div className="space-y-1.5">
                        {data.tasksByProject.map((p) => (
                            <div
                                key={p.projectId}
                                className="flex items-center justify-between p-2 rounded bg-background border"
                            >
                                <span className="text-sm font-medium truncate">{p.projectName}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="secondary" className="text-xs">
                                        {p.openCount} abiertas
                                    </Badge>
                                    {p.overdueCount > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                            {p.overdueCount} vencidas
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upcoming deadlines */}
            <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" />
                    Próximas fechas límite
                </div>
                {data.upcomingTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No hay tareas con fecha próxima.</p>
                ) : (
                    <div className="space-y-1">
                        {data.upcomingTasks.map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center justify-between gap-3 p-1.5 text-xs"
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {t.priority && (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] px-1.5 py-0 shrink-0",
                                                PRIORITY_COLORS[t.priority] || "",
                                            )}
                                        >
                                            {t.priority}
                                        </Badge>
                                    )}
                                    <span className="truncate font-medium">{t.title}</span>
                                    {t.projectName && (
                                        <span className="text-muted-foreground truncate">· {t.projectName}</span>
                                    )}
                                </div>
                                <span className="text-muted-foreground tabular-nums shrink-0">
                                    {formatDate(t.dueDate)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Capacity() {
    const { currentOrganization } = useOrganization();
    const queryClient = useQueryClient();
    const [weekOffset, setWeekOffset] = useState(0);
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

    const weekStart = useMemo(() => {
        return addWeeks(startOfISOWeek(new Date()), weekOffset);
    }, [weekOffset]);

    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    const { data, isLoading, error } = useQuery({
        queryKey: ["capacity-week", currentOrganization?.id, weekStartStr],
        queryFn: () => capacityService.getWeek(weekStartStr),
        enabled: !!currentOrganization,
    });

    if (!currentOrganization) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-2xl font-bold mb-4">Sin organización seleccionada</h2>
                <p className="text-muted-foreground">Selecciona una organización para ver su capacidad.</p>
            </div>
        );
    }

    const rows: CapacityRow[] = data?.rows || [];
    const totals = data?.totals;

    const toggleExpand = (userId: string) => {
        setExpandedUserId((prev) => (prev === userId ? null : userId));
    };

    return (
        <>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Capacidad del equipo</h1>
                    <p className="text-muted-foreground mt-1">
                        {currentOrganization.name} · Semana del {format(weekStart, "d 'de' MMM yyyy")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                        Esta semana
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="flex items-center gap-3 pt-5 pb-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Miembros</p>
                            <p className="text-2xl font-bold">{totals?.members ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-5 pb-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Disponibles</p>
                            <p className="text-2xl font-bold">{totals?.available ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-5 pb-4">
                        <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Ajustados</p>
                            <p className="text-2xl font-bold">{totals?.tight ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-5 pb-4">
                        <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Sobrecargados</p>
                            <p className="text-2xl font-bold">{totals?.overloaded ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Members list */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-destructive/10">
                            <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
                            <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
                            <Button onClick={() => queryClient.invalidateQueries()}>Retry</Button>
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No hay miembros activos en esta organización.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {rows.map((row) => {
                                const style = BUCKET_STYLES[row.bucket];
                                const utilCapped = Math.min(row.utilizationPercent, 150);
                                const isExpanded = expandedUserId === row.userId;
                                return (
                                    <div key={row.userId} className="rounded-lg border bg-card overflow-hidden">
                                        <button
                                            onClick={() => toggleExpand(row.userId)}
                                            className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
                                        >
                                            <ChevronDown
                                                className={cn(
                                                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                                                    isExpanded && "rotate-180",
                                                )}
                                            />
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="text-xs font-medium">
                                                    {getInitials(row.fullName, row.email)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {row.fullName || row.email}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.role.toLowerCase()} · {row.activeProjectCount} proyectos
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "text-xs font-medium px-2 py-0.5 rounded shrink-0",
                                                            style.className,
                                                        )}
                                                    >
                                                        {style.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Progress value={utilCapped} className="h-2 flex-1" />
                                                    <span className="text-xs font-medium tabular-nums w-20 text-right">
                                                        {row.plannedHours}h / {row.availableHours}h
                                                    </span>
                                                    <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                                                        {row.utilizationPercent}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground gap-0.5 w-32 shrink-0">
                                                <span>
                                                    <strong className="text-foreground">{row.openTaskCount}</strong> tareas abiertas
                                                </span>
                                                {row.overdueTaskCount > 0 && (
                                                    <span className="text-red-600">
                                                        <strong>{row.overdueTaskCount}</strong> vencidas
                                                    </span>
                                                )}
                                                <span>{row.loggedHoursWeek}h registradas</span>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t">
                                                <WorkloadDetail userId={row.userId} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground mt-4">
                * Estimación: {data?.hoursPerDay ?? 8}h × {data?.workDays ?? 5} días = {(data?.hoursPerDay ?? 8) * (data?.workDays ?? 5)}h disponibles/semana ·
                Horas planificadas = tareas abiertas × 4h. Click en una fila para ver detalle.
            </p>
        </>
    );
}
