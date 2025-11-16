import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { CheckCircle, X } from "lucide-react";
import type { Notification } from "@/App";

interface NotificationsSheetProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

export default function NotificationsSheet({ notifications, isOpen, onClose, onMarkRead }: NotificationsSheetProps) {
  const handleMarkRead = (id: string) => {
    onMarkRead(id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Уведомления</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Нет уведомлений</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 rounded-xl ${
                  notification.isRead ? 'bg-muted/30' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                }`}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
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
                      onClick={() => handleMarkRead(notification.id)}
                      className="p-1 rounded-full hover:bg-muted"
                      data-testid={`button-mark-read-${notification.id}`}
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
