import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, User, Bell, CheckCircle, X } from "lucide-react";
import type { Notification } from "@/App";

interface SettingsPageProps {
  username: string;
  registeredAt: string;
  notifications: Notification[];
  onClearData: () => void;
  onMarkNotificationRead: (id: string) => void;
}

export default function SettingsPage({ username, registeredAt, notifications, onClearData, onMarkNotificationRead }: SettingsPageProps) {
  const formattedDate = new Date(registeredAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-6 pt-8 pb-28 bg-background">
      <div className="max-w-md w-full mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Настройки</h1>

        <Card className="p-6 shadow-soft">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-20 h-20 shadow-soft-sm">
              <AvatarFallback className="bg-accent text-white text-2xl font-bold">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground" data-testid="text-username">
                {username}
              </h2>
              <p className="text-sm text-muted-foreground font-medium" data-testid="text-registered-date">
                Дата регистрации: {formattedDate}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-5 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Имя в Telegram:</span>
              <span className="text-foreground font-bold">@{username}</span>
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">История уведомлений</h2>
            </div>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white" data-testid="badge-unread-count">
                {unreadCount}
              </Badge>
            )}
          </div>

          {notifications.length === 0 ? (
            <Card className="p-8 shadow-soft">
              <p className="text-center text-muted-foreground font-medium">Нет уведомлений</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 shadow-soft ${
                    notification.isRead ? 'bg-card' : 'bg-blue-50 border-blue-200'
                  }`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => onMarkNotificationRead(notification.id)}
                        className="p-1.5 rounded-full hover:bg-muted transition-soft"
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full justify-center gap-2 min-h-[52px] text-destructive hover:text-destructive rounded-lg font-bold"
          onClick={onClearData}
          data-testid="button-clear-data"
        >
          <Trash2 className="w-5 h-5" />
          Очистить данные
        </Button>

        <p className="text-xs text-center text-muted-foreground font-medium" style={{ opacity: 0.6 }}>
          Romax Pay beta 1
        </p>
      </div>
    </div>
  );
}
