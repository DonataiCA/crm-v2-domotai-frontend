import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
    AlertTriangle,
    Activity,
    CheckCircle2,
    Clock,
    Flame,
    XCircle,
    ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { incidentService } from "@/services/incident.service";
import type {
    IncidentDTO,
    IncidentSeverity,
    IncidentStatus,
} from "@/types/incident";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
    MINOR: "bg-blue-500",
    MAJOR: "bg-amber-500",
    CRITICAL: "bg-red-600",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
    OPEN: "bg-red-100 text-red-700 border-red-200",
    ACKNOWLEDGED: "bg-amber-100 text-amber-700 border-amber-200",
    MITIGATING: "bg-blue-100 text-blue-700 border-blue-200",
    RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
    OPEN: "Abierto",
    ACKNOWLEDGED: "Reconocido",
    MITIGATING: "Mitigando",
    RESOLVED: "Resuelto",
    CLOSED: "Cerrado",
};

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
    MINOR: "Menor",
    MAJOR: "Mayor",
    CRITICAL: "Critico",
};

function formatMttr(minutes: number | null): string {
    if (minutes == null) return "—";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function Incidents() {
    const { currentOrganization } = useOrganization();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">("OPEN");
    const [selected, setSelected] = useState<IncidentDTO | null>(null);

    const { data: list, isLoading, error } = useQuery({
        queryKey: ["incidents", currentOrganization?.id, statusFilter],
        queryFn: () => incidentService.list({ status: statusFilter, limit: 50 }),
        enabled: !!currentOrganization,
    });

    const { data: summary } = useQuery({
        queryKey: ["incidents-summary", currentOrganization?.id],
        queryFn: () => incidentService.summary(),
        enabled: !!currentOrganization,
        refetchInterval: 60_000,
    });

    const updateStatusMutation = useMutation({
        mutationFn: (vars: { id: string; status: IncidentStatus }) =>
            incidentService.update(vars.id, { status: vars.status }),
        onSuccess: (updated) => {
            toast({ title: `Estado: ${STATUS_LABELS[updated.status]}` });
            setSelected(updated);
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
            queryClient.invalidateQueries({ queryKey: ["incidents-summary"] });
        },
    });

    if (!currentOrganization) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-2xl font-bold mb-4">Sin organizacion seleccionada</h2>
            </div>
        );
    }

    const incidents = list?.data || [];

    return (
        <>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Incidentes</h1>
                    <p className="text-muted-foreground mt-1">{currentOrganization.name}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="flex items-center gap-3 pt-5 pb-4">
                        <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                            <Flame className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Activos</p>
                            <p className="text-2xl font-bold">{summary?.open ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-5 pb-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">MTTR (30d)</p>
                            <p className="text-2xl font-bold">{formatMttr(summary?.meanTimeToResolveMinutes ?? null)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-5 pb-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total mostrados</p>
                            <p className="text-2xl font-bold">{incidents.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter tabs */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-4">
                <TabsList>
                    <TabsTrigger value="OPEN">Abiertos</TabsTrigger>
                    <TabsTrigger value="ACKNOWLEDGED">Reconocidos</TabsTrigger>
                    <TabsTrigger value="MITIGATING">Mitigando</TabsTrigger>
                    <TabsTrigger value="RESOLVED">Resueltos</TabsTrigger>
                    <TabsTrigger value="CLOSED">Cerrados</TabsTrigger>
                    <TabsTrigger value="ALL">Todos</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* List */}
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
            ) : incidents.length === 0 ? (
                <Card>
                    <CardContent className="py-16 flex flex-col items-center text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mb-3 text-emerald-500" />
                        <p className="text-lg font-medium">Sin incidentes en este filtro</p>
                        <p className="text-sm">Estamos en buena forma.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {incidents.map((inc) => (
                        <button
                            key={inc.id}
                            type="button"
                            className="w-full text-left rounded-lg border bg-card hover:bg-muted/30 transition-colors p-4"
                            onClick={() => setSelected(inc)}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={cn(
                                        "h-2.5 w-2.5 rounded-full mt-2 shrink-0",
                                        SEVERITY_STYLES[inc.severity],
                                    )}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-medium text-sm truncate">{inc.title}</h3>
                                        <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[inc.status])}>
                                            {STATUS_LABELS[inc.status]}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px]">
                                            {inc.source}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                        {inc.description || "Sin descripcion"}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                                        <span>
                                            <Activity className="h-3 w-3 inline mr-1" />
                                            {formatDistanceToNow(new Date(inc.detectedAt), { addSuffix: true, locale: es })}
                                        </span>
                                        {inc.project && <span>· {inc.project.name}</span>}
                                        {inc.owner && <span>· {inc.owner.fullName || inc.owner.email}</span>}
                                        <span>· {inc.eventCount} eventos</span>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Detail dialog */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                {selected && (
                    <IncidentDetailDialog
                        incident={selected}
                        onTransition={(status) => updateStatusMutation.mutate({ id: selected.id, status })}
                    />
                )}
            </Dialog>
        </>
    );
}

// ───── Detail dialog ─────
function IncidentDetailDialog({
    incident,
    onTransition,
}: {
    incident: IncidentDTO;
    onTransition: (status: IncidentStatus) => void;
}) {
    const nextActions: { label: string; status: IncidentStatus; icon: typeof Activity }[] = [];

    if (incident.status === "OPEN") {
        nextActions.push({ label: "Reconocer", status: "ACKNOWLEDGED", icon: AlertTriangle });
    }
    if (incident.status === "OPEN" || incident.status === "ACKNOWLEDGED") {
        nextActions.push({ label: "Mitigando", status: "MITIGATING", icon: Activity });
    }
    if (incident.status !== "RESOLVED" && incident.status !== "CLOSED") {
        nextActions.push({ label: "Resolver", status: "RESOLVED", icon: CheckCircle2 });
    }
    if (incident.status === "RESOLVED") {
        nextActions.push({ label: "Cerrar", status: "CLOSED", icon: XCircle });
    }
    if (incident.status === "RESOLVED" || incident.status === "CLOSED") {
        nextActions.push({ label: "Reabrir", status: "OPEN", icon: Activity });
    }

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full", SEVERITY_STYLES[incident.severity])} />
                    <DialogTitle className="text-left">{incident.title}</DialogTitle>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={cn(STATUS_STYLES[incident.status])}>
                        {STATUS_LABELS[incident.status]}
                    </Badge>
                    <Badge variant="outline">{SEVERITY_LABELS[incident.severity]}</Badge>
                    <Badge variant="outline">{incident.source}</Badge>
                </div>
            </DialogHeader>

            <div className="space-y-4">
                {incident.description && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Descripcion</p>
                        <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Detectado</p>
                        <p>{format(new Date(incident.detectedAt), "PPp", { locale: es })}</p>
                    </div>
                    {incident.acknowledgedAt && (
                        <div>
                            <p className="text-xs text-muted-foreground">Reconocido</p>
                            <p>{format(new Date(incident.acknowledgedAt), "PPp", { locale: es })}</p>
                        </div>
                    )}
                    {incident.resolvedAt && (
                        <div>
                            <p className="text-xs text-muted-foreground">Resuelto</p>
                            <p>{format(new Date(incident.resolvedAt), "PPp", { locale: es })}</p>
                        </div>
                    )}
                    {incident.project && (
                        <div>
                            <p className="text-xs text-muted-foreground">Proyecto</p>
                            <p>{incident.project.name}</p>
                        </div>
                    )}
                    {incident.owner && (
                        <div>
                            <p className="text-xs text-muted-foreground">Owner</p>
                            <p>{incident.owner.fullName || incident.owner.email}</p>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Timeline</p>
                    <div className="space-y-2 border-l-2 border-muted pl-4 ml-1">
                        {incident.events.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Sin eventos todavia.</p>
                        )}
                        {incident.events.map((ev) => (
                            <div key={ev.id} className="relative">
                                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                                <p className="text-sm font-medium">{ev.message}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {ev.type} ·{" "}
                                    {formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true, locale: es })}
                                    {ev.createdBy && ` · ${ev.createdBy.fullName || ev.createdBy.email}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2">
                {nextActions.map((a) => (
                    <Button key={a.status} variant="outline" onClick={() => onTransition(a.status)}>
                        <a.icon className="h-4 w-4 mr-1" />
                        {a.label}
                    </Button>
                ))}
            </DialogFooter>
        </DialogContent>
    );
}
