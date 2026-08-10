import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonitorEvent } from '@/types/monitor';

interface SystemMetricsChartProps {
    heartbeats: MonitorEvent[];
}

export function SystemMetricsChart({ heartbeats }: SystemMetricsChartProps) {
    const data = useMemo(() => {
        return heartbeats.map((hb) => {
            const p = hb.payload as Record<string, number>;
            const memPercent = p.memoryTotalMB && p.memoryTotalMB > 0
                ? Math.round((p.memoryUsedMB / p.memoryTotalMB) * 100)
                : 0;
            return {
                time: new Date(hb.receivedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                cpu: Math.round(p.cpu ?? 0),
                memory: memPercent,
            };
        });
    }, [heartbeats]);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-sm">Metricas del Sistema</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                        Sin datos de heartbeat. Instala el SDK para ver metricas.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-sm">CPU y Memoria (%)</CardTitle></CardHeader>
            <CardContent>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: number, name: string) => [`${value}%`, name === 'cpu' ? 'CPU' : 'Memoria']} />
                            <Legend formatter={(value) => value === 'cpu' ? 'CPU' : 'Memoria'} />
                            <Line type="monotone" dataKey="cpu" stroke="#2563eb" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="memory" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
