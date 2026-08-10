import { Activity, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { MonitorStatus } from '@/types/monitor';

interface MonitorOverviewCardsProps {
    status: MonitorStatus | null;
}

export function MonitorOverviewCards({ status }: MonitorOverviewCardsProps) {
    if (!status) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Estado',
            value: status.isUp === null ? 'Sin datos' : status.isUp ? 'Operativo' : 'Caido',
            icon: status.isUp ? Wifi : WifiOff,
            color: status.isUp === null ? 'text-muted-foreground' : status.isUp ? 'text-green-500' : 'text-red-500',
            bg: status.isUp === null ? 'bg-muted/50' : status.isUp ? 'bg-green-50' : 'bg-red-50',
        },
        {
            label: 'Uptime (24h)',
            value: status.uptimePercent !== null ? `${status.uptimePercent}%` : 'N/A',
            icon: Activity,
            color: (status.uptimePercent ?? 100) >= 99 ? 'text-green-500' : (status.uptimePercent ?? 100) >= 95 ? 'text-yellow-500' : 'text-red-500',
            bg: 'bg-blue-50',
        },
        {
            label: 'Tiempo Respuesta',
            value: status.avgResponseTimeMs !== null ? `${status.avgResponseTimeMs}ms` : 'N/A',
            icon: Clock,
            color: (status.avgResponseTimeMs ?? 0) < 500 ? 'text-green-500' : (status.avgResponseTimeMs ?? 0) < 1000 ? 'text-yellow-500' : 'text-red-500',
            bg: 'bg-purple-50',
        },
        {
            label: 'Errores (24h)',
            value: String(status.errorCount24h),
            icon: AlertTriangle,
            color: status.errorCount24h === 0 ? 'text-green-500' : status.errorCount24h < 10 ? 'text-yellow-500' : 'text-red-500',
            bg: 'bg-orange-50',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {cards.map((card) => (
                <Card key={card.label} className={card.bg}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                            </div>
                            <card.icon className={`h-8 w-8 ${card.color} opacity-50`} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
