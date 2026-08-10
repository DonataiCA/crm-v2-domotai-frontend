import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { monitorService } from '@/services/monitor.service';
import { projectService } from '@/services/project.service';
import { MonitorOverviewCards } from '@/components/monitor/MonitorOverviewCards';
import { UptimeChart } from '@/components/monitor/UptimeChart';
import { SystemMetricsChart } from '@/components/monitor/SystemMetricsChart';
import { RecentErrors } from '@/components/monitor/RecentErrors';
import { DeployHistory } from '@/components/monitor/DeployHistory';
import { ApiKeySection } from '@/components/monitor/ApiKeySection';

export default function ProjectMonitor() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { currentOrganization } = useOrganization();
    const [apiKey, setApiKey] = useState<string | null>(null);

    const { data: project } = useQuery({
        queryKey: ['project', projectId, currentOrganization?.id],
        queryFn: () => projectService.getProject(projectId!),
        enabled: !!projectId && !!currentOrganization?.id,
    });

    const { data: status, refetch: refetchStatus } = useQuery({
        queryKey: ['monitor-status', projectId, currentOrganization?.id],
        queryFn: () => monitorService.getStatus(projectId!),
        enabled: !!projectId && !!currentOrganization?.id,
        refetchInterval: 60000, // Refresh every minute
    });

    const { data: healthChecksData } = useQuery({
        queryKey: ['monitor-health-checks', projectId],
        queryFn: () => monitorService.getHealthChecks(projectId!),
        enabled: !!projectId,
    });

    const { data: metricsData } = useQuery({
        queryKey: ['monitor-metrics', projectId],
        queryFn: () => monitorService.getMetrics(projectId!),
        enabled: !!projectId,
    });

    const { data: errorsData } = useQuery({
        queryKey: ['monitor-errors', projectId],
        queryFn: () => monitorService.getEvents(projectId!, 1, 50, 'ERROR'),
        enabled: !!projectId,
    });

    const { data: deploysData } = useQuery({
        queryKey: ['monitor-deploys', projectId],
        queryFn: () => monitorService.getEvents(projectId!, 1, 20, 'DEPLOY'),
        enabled: !!projectId,
    });

    const currentApiKey = apiKey || project?.monitorApiKey || null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{project?.name || 'Proyecto'}</h1>
                            {status && (
                                <Badge variant={status.isUp ? 'default' : 'destructive'} className={status.isUp ? 'bg-green-500' : ''}>
                                    {status.isUp === null ? 'Sin datos' : status.isUp ? 'Operativo' : 'Caido'}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">Monitor de Produccion</p>
                    </div>
                </div>
                {project?.productionUrl && (
                    <a
                        href={project.productionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
                    >
                        {project.productionUrl}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </div>

            {/* API Key Section */}
            <ApiKeySection
                projectId={projectId!}
                apiKey={currentApiKey}
                onKeyGenerated={(key) => {
                    setApiKey(key);
                    refetchStatus();
                }}
            />

            {/* Overview Cards */}
            <MonitorOverviewCards status={status || null} />

            {/* Tabs */}
            <Tabs defaultValue="health" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="health">Salud</TabsTrigger>
                    <TabsTrigger value="errors">
                        Errores
                        {(status?.errorCount24h ?? 0) > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 text-xs">{status?.errorCount24h}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="deploys">Deploys</TabsTrigger>
                </TabsList>

                <TabsContent value="health" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <UptimeChart healthChecks={healthChecksData?.data || []} />
                        <SystemMetricsChart heartbeats={metricsData?.heartbeats || []} />
                    </div>

                    {/* Last heartbeat info */}
                    {status?.lastHeartbeat && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {(() => {
                                const p = status.lastHeartbeat.payload as Record<string, string | number>;
                                return (
                                    <>
                                        <div className="bg-muted/50 rounded-lg p-3">
                                            <p className="text-xs text-muted-foreground">Version</p>
                                            <p className="font-mono font-semibold">{p.version || 'N/A'}</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3">
                                            <p className="text-xs text-muted-foreground">Node</p>
                                            <p className="font-mono font-semibold">{p.nodeVersion || 'N/A'}</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3">
                                            <p className="text-xs text-muted-foreground">Uptime</p>
                                            <p className="font-semibold">
                                                {p.uptimeSeconds ? `${Math.floor(Number(p.uptimeSeconds) / 3600)}h ${Math.floor((Number(p.uptimeSeconds) % 3600) / 60)}m` : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3">
                                            <p className="text-xs text-muted-foreground">Ultimo Heartbeat</p>
                                            <p className="font-semibold">
                                                {new Date(status.lastHeartbeat!.receivedAt).toLocaleTimeString('es-ES')}
                                            </p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="errors">
                    <RecentErrors errors={errorsData?.data || []} />
                </TabsContent>

                <TabsContent value="deploys">
                    <DeployHistory deploys={deploysData?.data || []} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
