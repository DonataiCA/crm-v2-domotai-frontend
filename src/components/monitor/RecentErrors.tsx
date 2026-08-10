import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MonitorEvent } from '@/types/monitor';

interface RecentErrorsProps {
    errors: MonitorEvent[];
}

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function RecentErrors({ errors }: RecentErrorsProps) {
    if (errors.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-sm">Errores Recientes</CardTitle></CardHeader>
                <CardContent>
                    <div className="py-8 text-center text-muted-foreground text-sm">
                        Sin errores reportados
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-sm">Errores Recientes</CardTitle></CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {errors.map((error) => {
                        const p = error.payload as Record<string, string | number>;
                        return (
                            <div key={error.id} className="px-4 py-3 flex items-start gap-3">
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {p.statusCode && (
                                            <Badge variant="destructive" className="text-xs">
                                                {p.statusCode}
                                            </Badge>
                                        )}
                                        {p.endpoint && (
                                            <span className="text-xs text-muted-foreground font-mono truncate">
                                                {p.method ? `${p.method} ` : ''}{p.endpoint}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground mt-1 truncate">{p.message || 'Error desconocido'}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(error.receivedAt)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
