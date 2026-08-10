import { useNavigate } from 'react-router-dom';
import {
    CheckSquare,
    Target,
    FolderKanban,
    Receipt,
    Users,
    Calendar,
    Bell,
    MessageSquare,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types/api';

const ICON_MAP: Record<string, React.ElementType> = {
    TASK_ASSIGNED: CheckSquare,
    TASK_COMPLETED: CheckSquare,
    TASK_COMMENT: MessageSquare,
    TASK_DUE_SOON: CheckSquare,
    LEAD_ASSIGNED: Target,
    LEAD_STAGE_CHANGED: Target,
    LEAD_CONVERTED: Target,
    PROJECT_CREATED: FolderKanban,
    PROJECT_MEMBER_ADDED: FolderKanban,
    PROJECT_TASK_ASSIGNED: FolderKanban,
    PROJECT_TASK_COMPLETED: FolderKanban,
    PROJECT_STATUS_CHANGED: FolderKanban,
    INVOICE_CREATED: Receipt,
    INVOICE_SENT: Receipt,
    INVOICE_PAID: Receipt,
    INVOICE_OVERDUE: Receipt,
    CONTACT_ASSIGNED: Users,
    CALENDAR_EVENT_REMINDER: Calendar,
    ORGANIZATION_MEMBER_ADDED: Users,
};

const ICON_COLOR_MAP: Record<string, string> = {
    TASK_ASSIGNED: 'text-blue-500',
    TASK_COMPLETED: 'text-green-500',
    TASK_COMMENT: 'text-violet-500',
    TASK_DUE_SOON: 'text-red-500',
    LEAD_ASSIGNED: 'text-amber-500',
    LEAD_STAGE_CHANGED: 'text-amber-500',
    LEAD_CONVERTED: 'text-green-500',
    PROJECT_CREATED: 'text-indigo-500',
    PROJECT_MEMBER_ADDED: 'text-indigo-500',
    PROJECT_TASK_ASSIGNED: 'text-indigo-500',
    PROJECT_TASK_COMPLETED: 'text-green-500',
    PROJECT_STATUS_CHANGED: 'text-indigo-500',
    INVOICE_CREATED: 'text-emerald-500',
    INVOICE_SENT: 'text-blue-500',
    INVOICE_PAID: 'text-green-500',
    INVOICE_OVERDUE: 'text-red-500',
    CONTACT_ASSIGNED: 'text-cyan-500',
    CALENDAR_EVENT_REMINDER: 'text-orange-500',
    ORGANIZATION_MEMBER_ADDED: 'text-purple-500',
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Map entity types to routes
function getEntityRoute(entityType: string | null, entityId: string | null): string | null {
    if (!entityType || !entityId) return null;
    const routes: Record<string, string> = {
        task: '/tasks',
        lead: '/leads',
        project: `/projects/${entityId}/tracking`,
        invoice: '/invoices',
        contact: '/contacts',
    };
    return routes[entityType] || null;
}

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
}

export function NotificationItem({ notification, onRead, onDelete }: NotificationItemProps) {
    const navigate = useNavigate();
    const Icon = ICON_MAP[notification.type] || Bell;
    const iconColor = ICON_COLOR_MAP[notification.type] || 'text-muted-foreground';

    const handleClick = () => {
        if (!notification.read) {
            onRead(notification.id);
        }
        const route = getEntityRoute(notification.entityType, notification.entityId);
        if (route) {
            navigate(route);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 border-b border-border/50 last:border-b-0',
                !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20',
            )}
        >
            {/* Icon */}
            <div className={cn('mt-0.5 flex-shrink-0', iconColor)}>
                <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    'text-sm leading-tight',
                    !notification.read ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}>
                    {notification.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {notification.body}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    {notification.actor && (
                        <span className="text-xs text-muted-foreground">
                            {notification.actor.fullName}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground/60">
                        {timeAgo(notification.createdAt)}
                    </span>
                </div>
            </div>

            {/* Unread dot + Delete */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                    }}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
