import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { NotificationDropdown } from './NotificationDropdown';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationBell() {
    const {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        fetchNotifications,
        loadMore,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications();

    const [prefsOpen, setPrefsOpen] = useState(false);

    return (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="end" sideOffset={8}>
                    <NotificationDropdown
                        notifications={notifications}
                        isLoading={isLoading}
                        hasMore={hasMore}
                        onFetch={fetchNotifications}
                        onLoadMore={loadMore}
                        onRead={markAsRead}
                        onMarkAllRead={markAllAsRead}
                        onDelete={deleteNotification}
                        onOpenPreferences={() => setPrefsOpen(true)}
                    />
                </PopoverContent>
            </Popover>

            <NotificationPreferencesDialog
                open={prefsOpen}
                onOpenChange={setPrefsOpen}
            />
        </>
    );
}
