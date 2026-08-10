import { Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MonitorEvent } from '@/types/monitor';

interface DeployHistoryProps {
    deploys: MonitorEvent[];
}

export function DeployHistory({ deploys }: DeployHistoryProps) {
    if (deploys.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-sm">Historial de Deploys</CardTitle></CardHeader>
                <CardContent>
                    <div className="py-8 text-center text-muted-foreground text-sm">
                        Sin deploys reportados. Usa <code className="bg-muted px-1 rounded">monitor.reportDeploy()</code> en tu CI/CD.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-sm">Historial de Deploys</CardTitle></CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {deploys.map((deploy) => {
                        const p = deploy.payload as Record<string, string>;
                        return (
                            <div key={deploy.id} className="px-4 py-3 flex items-center gap-3">
                                <Rocket className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">{p.version || 'unknown'}</span>
                                        <Badge variant="outline" className="text-xs">{p.environment || 'production'}</Badge>
                                    </div>
                                    {p.commitSha && (
                                        <span className="text-xs text-muted-foreground font-mono">{p.commitSha.slice(0, 7)}</span>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {new Date(deploy.receivedAt).toLocaleDateString('es-ES', {
                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
