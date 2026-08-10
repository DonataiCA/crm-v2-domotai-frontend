import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonitorHealthCheck } from '@/types/monitor';

interface UptimeChartProps {
    healthChecks: MonitorHealthCheck[];
}

export function UptimeChart({ healthChecks }: UptimeChartProps) {
    const data = useMemo(() => {
        return [...healthChecks]
            .reverse()
            .map((hc) => ({
                time: new Date(hc.checkedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                responseTime: hc.responseTimeMs ?? 0,
                isUp: hc.isUp ? 1 : 0,
            }));
    }, [healthChecks]);

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-sm">Tiempo de Respuesta</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                        Sin datos de health checks
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-sm">Tiempo de Respuesta (ms)</CardTitle></CardHeader>
            <CardContent>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number) => [`${value}ms`, 'Response Time']}
                                labelFormatter={(label) => `Hora: ${label}`}
                            />
                            <Area
                                type="monotone"
                                dataKey="responseTime"
                                stroke="#2563eb"
                                fill="#2563eb"
                                fillOpacity={0.1}
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
