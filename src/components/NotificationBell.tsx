import { useState, useEffect } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  case_id: string | null;
  task_id: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    };

    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          toast({
            title: (payload.new as Notification).title,
            description: (payload.new as Notification).message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.case_id) {
      navigate(`/case/${notification.case_id}`);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "deadline_warning":
        return "⚠️";
      case "task_reminder":
        return "📋";
      case "case_update":
        return "📁";
      default:
        return "🔔";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaties</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3 mr-1" />
              Alles gelezen
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Geen notificaties
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: nl,
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
