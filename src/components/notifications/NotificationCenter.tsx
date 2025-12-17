/**
 * Notification Center
 * Smart notification display with priority sorting and actions
 */

import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Settings, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { NotificationRouter } from '@/lib/notifications/router';
import { PriorityScorer } from '@/lib/notifications/priorityScorer';
import { useAuth } from '@/hooks/useAuth';
import type { Notification, NotificationStats } from '@/types/notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationPreferencesDialog } from '@/components/notifications/NotificationPreferencesDialog';

export function NotificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    by_priority: { critical: 0, urgent: 0, high: 0, normal: 0, low: 0 },
    by_type: { deadline: 0, approval: 0, update: 0, reminder: 0, escalation: 0, digest: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority'>('unread');
  const [showPreferences, setShowPreferences] = useState(false);

  // Load notifications
  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .gte('expires_at', new Date().toISOString())
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
      return;
    }

    const typedData = (data || []) as unknown as Notification[];
    const sortedNotifications = PriorityScorer.sortByPriority(typedData);
    setNotifications(sortedNotifications as Notification[]);
    
    // Calculate stats
    calculateStats(sortedNotifications);
    
    setLoading(false);
  };

  // Calculate statistics
  const calculateStats = (notifs: Notification[]) => {
    const newStats: NotificationStats = {
      total: notifs.length,
      unread: notifs.filter((n) => !n.read_at).length,
      by_priority: { critical: 0, urgent: 0, high: 0, normal: 0, low: 0 },
      by_type: { deadline: 0, approval: 0, update: 0, reminder: 0, escalation: 0, digest: 0 },
    };

    notifs.forEach((n) => {
      newStats.by_priority[n.priority]++;
      newStats.by_type[n.type]++;
    });

    setStats(newStats);
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    const success = await NotificationRouter.markAsRead(notificationId);
    
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString(), status: 'read' }
            : n
        )
      );
      
      toast({
        title: 'Gelezen',
        description: 'Notificatie gemarkeerd als gelezen',
      });
    }
  };

  // Mark notification as acted
  const handleMarkAsActed = async (notificationId: string) => {
    const success = await NotificationRouter.markAsActed(notificationId);
    
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, acted_at: new Date().toISOString(), status: 'acted' }
            : n
        )
      );
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user) return;

    const success = await NotificationRouter.markAllAsRead(user.id);
    
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
          status: 'read',
        }))
      );
      
      toast({
        title: 'Alle gelezen',
        description: 'Alle notificaties gemarkeerd als gelezen',
      });
    }
  };

  // Handle notification action
  const handleAction = async (notificationId: string, action: string) => {
    await handleMarkAsActed(notificationId);
    
    // Handle specific actions
    switch (action) {
      case 'approve':
        toast({ title: 'Goedgekeurd', description: 'Item is goedgekeurd' });
        break;
      case 'reject':
        toast({ title: 'Afgewezen', description: 'Item is afgewezen', variant: 'destructive' });
        break;
      case 'complete':
        toast({ title: 'Voltooid', description: 'Taak is voltooid' });
        break;
      default:
        break;
    }
  };

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    loadNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Show toast for high priority
          if (newNotification.priority === 'urgent' || newNotification.priority === 'critical') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.priority === 'critical' ? 'destructive' : 'default',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Recalculate stats when notifications change
  useEffect(() => {
    calculateStats(notifications);
  }, [notifications]);

  // Filter notifications
  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = notifications.filter((n) => !n.read_at);
    } else if (filter === 'priority') {
      filtered = PriorityScorer.filterByMinimumPriority(notifications, 60);
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {stats.unread > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {stats.unread > 9 ? '9+' : stats.unread}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Notificaties</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreferences(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {stats.unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Alles gelezen
                  </Button>
                )}
              </div>
            </div>
            <SheetDescription>
              {stats.unread > 0
                ? `${stats.unread} ongelezen van ${stats.total}`
                : 'Geen ongelezen notificaties'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as never)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="unread">
                  Ongelezen
                  {stats.unread > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {stats.unread}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="priority">
                  Belangrijk
                  {(stats.by_priority.critical + stats.by_priority.urgent) > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {stats.by_priority.critical + stats.by_priority.urgent}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">Alle</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-4">
                <ScrollArea className="h-[calc(100vh-250px)]">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Geen notificaties
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredNotifications.map((notification, index) => (
                        <div key={notification.id}>
                          <NotificationItem
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onAction={handleAction}
                          />
                          {index < filteredNotifications.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <NotificationPreferencesDialog
        open={showPreferences}
        onOpenChange={setShowPreferences}
      />
    </>
  );
}
