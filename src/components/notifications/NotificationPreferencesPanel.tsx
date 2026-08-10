import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notification.service';
import type { NotificationPreference } from '@/types/api';
import {
    CheckSquare,
    Target,
    FolderKanban,
    Receipt,
    Users,
    Calendar,
    Building,
    Bell,
} from 'lucide-react';

interface PrefState {
    notificationType: string;
    channel: string;
    enabled: boolean;
}

const DEFAULT_CATEGORIES: Record<string, string[]> = {
    Tareas: ['TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_COMMENT', 'TASK_DUE_SOON'],
    Leads: ['LEAD_ASSIGNED', 'LEAD_STAGE_CHANGED', 'LEAD_CONVERTED'],
    Proyectos: ['PROJECT_CREATED', 'PROJECT_MEMBER_ADDED', 'PROJECT_TASK_ASSIGNED', 'PROJECT_TASK_COMPLETED', 'PROJECT_STATUS_CHANGED'],
    Facturas: ['INVOICE_CREATED', 'INVOICE_SENT', 'INVOICE_PAID', 'INVOICE_OVERDUE'],
    Contactos: ['CONTACT_ASSIGNED'],
    Calendario: ['CALENDAR_EVENT_REMINDER'],
    Organizacion: ['ORGANIZATION_MEMBER_ADDED'],
};

const DEFAULT_LABELS: Record<string, string> = {
    TASK_ASSIGNED: 'Tarea asignada',
    TASK_COMPLETED: 'Tarea completada',
    TASK_COMMENT: 'Comentario en tarea',
    TASK_DUE_SOON: 'Tarea por vencer',
    LEAD_ASSIGNED: 'Lead asignado',
    LEAD_STAGE_CHANGED: 'Cambio de etapa',
    LEAD_CONVERTED: 'Lead convertido',
    PROJECT_CREATED: 'Proyecto creado',
    PROJECT_MEMBER_ADDED: 'Agregado a proyecto',
    PROJECT_TASK_ASSIGNED: 'Tarea asignada',
    PROJECT_TASK_COMPLETED: 'Tarea completada',
    PROJECT_STATUS_CHANGED: 'Cambio de estado',
    INVOICE_CREATED: 'Factura creada',
    INVOICE_SENT: 'Factura enviada',
    INVOICE_PAID: 'Factura pagada',
    INVOICE_OVERDUE: 'Factura vencida',
    CONTACT_ASSIGNED: 'Contacto asignado',
    CALENDAR_EVENT_REMINDER: 'Recordatorio',
    ORGANIZATION_MEMBER_ADDED: 'Nuevo miembro',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    Tareas: CheckSquare,
    Leads: Target,
    Proyectos: FolderKanban,
    Facturas: Receipt,
    Contactos: Users,
    Calendario: Calendar,
    Organizacion: Building,
};

export function NotificationPreferencesPanel() {
    const { toast } = useToast();
    const [preferences, setPreferences] = useState<PrefState[]>([]);
    const [labels, setLabels] = useState<Record<string, string>>(DEFAULT_LABELS);
    const [categories, setCategories] = useState<Record<string, string[]>>(DEFAULT_CATEGORIES);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        notificationService.getPreferences().then((res) => {
            setLabels(res.labels || DEFAULT_LABELS);
            setCategories(res.categories || DEFAULT_CATEGORIES);

            const allTypes = Object.values(res.categories || DEFAULT_CATEGORIES).flat();
            const serverPrefs = new Map(res.data.map((p: NotificationPreference) => [p.notificationType, p]));

            const prefs = allTypes.map((type) => {
                const existing = serverPrefs.get(type);
                return {
                    notificationType: type,
                    channel: existing?.channel || 'BOTH',
                    enabled: existing?.enabled ?? true,
                };
            });
            setPreferences(prefs);
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las preferencias' });
        }).finally(() => setLoading(false));
    }, [toast]);

    const updatePref = (type: string, field: 'channel' | 'enabled', value: string | boolean) => {
        setPreferences((prev) =>
            prev.map((p) => (p.notificationType === type ? { ...p, [field]: value } : p)),
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await notificationService.updatePreferences(preferences);
            toast({ title: 'Guardado', description: 'Preferencias de notificaciones actualizadas' });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar las preferencias' });
        } finally {
            setSaving(false);
        }
    };

    const getPref = (type: string): PrefState => {
        return preferences.find((p) => p.notificationType === type) || {
            notificationType: type,
            channel: 'BOTH',
            enabled: true,
        };
    };

    if (loading) {
        return <div className="py-8 text-center text-muted-foreground">Cargando preferencias...</div>;
    }

    return (
        <div className="space-y-8">
            {/* Channel legend */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground pb-2 border-b">
                <div className="flex items-center gap-1.5">
                    <Bell className="h-4 w-4" />
                    <span><strong>Ambos</strong> = In-app + Email</span>
                </div>
                <div>
                    <strong>Solo app</strong> = Solo notificacion en la campana
                </div>
                <div>
                    <strong>Solo email</strong> = Solo correo electronico
                </div>
            </div>

            {Object.entries(categories).map(([category, types]) => {
                const Icon = CATEGORY_ICONS[category] || Bell;
                return (
                    <div key={category}>
                        <div className="flex items-center gap-2 mb-4">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                {category}
                            </h4>
                        </div>
                        <div className="space-y-3 ml-6">
                            {types.map((type) => {
                                const pref = getPref(type);
                                return (
                                    <div key={type} className="flex items-center justify-between gap-4 py-1">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Switch
                                                checked={pref.enabled}
                                                onCheckedChange={(v) => updatePref(type, 'enabled', v)}
                                            />
                                            <span className="text-sm">
                                                {labels[type] || type}
                                            </span>
                                        </div>
                                        <Select
                                            value={pref.channel}
                                            onValueChange={(v) => updatePref(type, 'channel', v)}
                                            disabled={!pref.enabled}
                                        >
                                            <SelectTrigger className="w-[130px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BOTH">Ambos</SelectItem>
                                                <SelectItem value="IN_APP">Solo app</SelectItem>
                                                <SelectItem value="EMAIL">Solo email</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Preferencias'}
                </Button>
            </div>
        </div>
    );
}
