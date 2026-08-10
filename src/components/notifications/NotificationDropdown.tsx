import { useEffect } from 'react';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/types/api';

interface NotificationDropdownProps {
    notifications: Notification[];
    isLoading: boolean;
    hasMore: boolean;
    onFetch: (page?: number, append?: boolean) => void;
    onLoadMore: () => void;
    onRead: (id: string) => void;
    onMarkAllRead: () => void;
    onDelete: (id: string) => void;
    onOpenPreferences?: () => void;
}

export function NotificationDropdown({
    notifications,
    isLoading,
    hasMore,
    onFetch,
    onLoadMore,
    onRead,
    onMarkAllRead,
    onDelete,
    onOpenPreferences,
}: NotificationDropdownProps) {
    // Fetch on mount
    useEffect(() => {
        onFetch(1, false);
    }, [onFetch]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">Notificaciones</h3>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={onMarkAllRead}
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Marcar todo como leido
                        </Button>
                    )}
                    {onOpenPreferences && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={onOpenPreferences}
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Body */}
            <ScrollArea className="max-h-[400px]">
                {notifications.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No tienes notificaciones</p>
                    </div>
                ) : (
                    <div>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRead={onRead}
                                onDelete={onDelete}
                            />
                        ))}
                        {hasMore && (
                            <div className="px-4 py-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={onLoadMore}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Cargando...' : 'Cargar mas'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
