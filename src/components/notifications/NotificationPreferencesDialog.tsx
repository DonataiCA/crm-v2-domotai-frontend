import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

interface NotificationPreferencesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

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

export function NotificationPreferencesDialog({ open, onOpenChange }: NotificationPreferencesDialogProps) {
    const { toast } = useToast();
    const [preferences, setPreferences] = useState<PrefState[]>([]);
    const [labels, setLabels] = useState<Record<string, string>>(DEFAULT_LABELS);
    const [categories, setCategories] = useState<Record<string, string[]>>(DEFAULT_CATEGORIES);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        notificationService.getPreferences().then((res) => {
            setLabels(res.labels || DEFAULT_LABELS);
            setCategories(res.categories || DEFAULT_CATEGORIES);

            // Build preference state from server data + defaults
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
        });
    }, [open, toast]);

    const updatePref = (type: string, field: 'channel' | 'enabled', value: string | boolean) => {
        setPreferences((prev) =>
            prev.map((p) => (p.notificationType === type ? { ...p, [field]: value } : p)),
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await notificationService.updatePreferences(preferences);
            toast({ title: 'Guardado', description: 'Preferencias actualizadas' });
            onOpenChange(false);
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Preferencias de Notificaciones</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-2">
                    {Object.entries(categories).map(([category, types]) => (
                        <div key={category}>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                                {category}
                            </h4>
                            <div className="space-y-3">
                                {types.map((type) => {
                                    const pref = getPref(type);
                                    return (
                                        <div key={type} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Switch
                                                    checked={pref.enabled}
                                                    onCheckedChange={(v) => updatePref(type, 'enabled', v)}
                                                />
                                                <span className="text-sm truncate">
                                                    {labels[type] || type}
                                                </span>
                                            </div>
                                            <Select
                                                value={pref.channel}
                                                onValueChange={(v) => updatePref(type, 'channel', v)}
                                                disabled={!pref.enabled}
                                            >
                                                <SelectTrigger className="w-[120px] h-8 text-xs">
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
                    ))}
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
