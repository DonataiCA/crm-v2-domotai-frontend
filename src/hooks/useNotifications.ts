import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken, getOrganizationId } from '@/lib/api-client';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const POLL_INTERVAL = 30000; // 30s polling fallback
const MAX_RECONNECT_DELAY = 30000;

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const eventSourceRef = useRef<EventSource | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectDelayRef = useRef(1000);

    // Fetch unread count
    const fetchUnreadCount = useCallback(async () => {
        try {
            const { count } = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch {
            // Silent — non-critical
        }
    }, []);

    // Fetch notifications (paginated)
    const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
        setIsLoading(true);
        try {
            const result = await notificationService.getNotifications(pageNum, 20);
            if (append) {
                setNotifications((prev) => [...prev, ...result.data]);
            } else {
                setNotifications(result.data);
            }
            setPage(pageNum);
            setHasMore(pageNum < result.pagination.pages);
        } catch {
            // Silent
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load more (next page)
    const loadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            fetchNotifications(page + 1, true);
        }
    }, [isLoading, hasMore, page, fetchNotifications]);

    // Mark as read
    const markAsRead = useCallback(async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // Silent
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })),
            );
            setUnreadCount(0);
        } catch {
            // Silent
        }
    }, []);

    // Delete notification
    const deleteNotification = useCallback(async (id: string) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications((prev) => {
                const notification = prev.find((n) => n.id === id);
                if (notification && !notification.read) {
                    setUnreadCount((c) => Math.max(0, c - 1));
                }
                return prev.filter((n) => n.id !== id);
            });
        } catch {
            // Silent
        }
    }, []);

    // Setup SSE connection
    const connectSSE = useCallback(() => {
        const token = getToken();
        const orgId = getOrganizationId();
        if (!token || !orgId) return;

        // Close existing
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}&orgId=${encodeURIComponent(orgId)}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.addEventListener('notification', (event) => {
            try {
                const notification: Notification = JSON.parse(event.data);
                setNotifications((prev) => [notification, ...prev]);
            } catch {
                // Invalid data
            }
        });

        es.addEventListener('unread-count', (event) => {
            try {
                const { count } = JSON.parse(event.data);
                setUnreadCount(count);
            } catch {
                // Invalid data
            }
        });

        es.onopen = () => {
            // Reset reconnect delay on success
            reconnectDelayRef.current = 1000;
            // Stop polling fallback
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };

        es.onerror = () => {
            // EventSource.CLOSED means the server rejected or connection is permanently gone
            // EventSource.CONNECTING means the browser is auto-reconnecting (let it)
            if (es.readyState === EventSource.CLOSED) {
                es.close();
                eventSourceRef.current = null;

                // Start polling fallback
                if (!pollIntervalRef.current) {
                    pollIntervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
                }

                // Exponential backoff reconnect
                const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY);
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
                    connectSSE();
                }, delay);
            }
        };
    }, [fetchUnreadCount]);

    // Initialize on mount
    useEffect(() => {
        fetchUnreadCount();
        connectSSE();

        return () => {
            eventSourceRef.current?.close();
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connectSSE, fetchUnreadCount]);

    return {
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        fetchNotifications,
        loadMore,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchUnreadCount,
    };
}
