import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Image as ImageIcon, Link as LinkIcon, FileText, Lock, Check, X, AlertCircle, Clock, Download } from "lucide-react";
import type { Transaction } from "@/App";
import { useToast } from "@/hooks/use-toast";

interface RequestDetailPageProps {
  request: Transaction;
  onBack: () => void;
  onCancelRequest: (requestId: string) => void;
}

const statusColors = {
  submitted: 'bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-[#FEF9C3] text-[#CA8A04] dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-[#DCFCE7] text-[#16A34A] dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusLabels = {
  submitted: 'ОТПРАВЛЕНА',
  processing: 'В ОБРАБОТКЕ',
  paid: 'ОПЛАЧЕНО',
  rejected: 'ОТКЛОНЕНО',
  cancelled: 'ОТМЕНЕНО',
};

const statusIcons = {
  submitted: AlertCircle,
  processing: Clock,
  paid: Check,
  rejected: X,
  cancelled: X,
};

export default function RequestDetailPage({ request, onBack, onCancelRequest }: RequestDetailPageProps) {
  const { toast } = useToast();

  const handleCancel = () => {
    onCancelRequest(request.id);
    toast({
      title: "Заявка отменена",
      description: "Средства возвращены на баланс.",
    });
  };

  const handleDownloadReceipt = () => {
    if (!request.receipt) return;
    
    const mimeType = request.receipt.mimeType;
    const base64Data = request.receipt.value;
    const fileName = request.receipt.name;
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Успешно",
      description: "Чек загружен",
    });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-6 pt-8 pb-28 bg-background">
      <div className="max-w-md w-full mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 font-medium" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Button>

        <h1 className="text-3xl font-bold text-foreground">Заявка №{request.id.slice(-6)}</h1>

        <div className="space-y-4">
          <Card className="p-6 shadow-card gradient-card rounded-lg">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Сумма</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{request.amountRub.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Эквивалент в USDT</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{request.usdtFrozen.toFixed(2)} USDT</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card gradient-card rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground">Статус</span>
              <Badge className={`${statusColors[request.status]} no-default-hover-elevate no-default-active-elevate font-bold px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1.5`}>
                {(() => {
                  const StatusIcon = statusIcons[request.status];
                  return <StatusIcon className="w-3.5 h-3.5" />;
                })()}
                {statusLabels[request.status]}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground">Срочность</span>
              <span className="text-sm font-bold text-foreground">
                {request.urgency === 'urgent' ? 'Срочно' : 'Стандартно'}
              </span>
            </div>
            {request.urgency === 'standard' && (
              <p className="text-xs text-green-600 dark:text-green-500 pt-3 border-t font-medium">✓ Курс на 0,5% выгоднее.</p>
            )}
          </Card>

          <Card className="p-6 shadow-card gradient-card rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground">Использованный курс</span>
              <span className="text-sm font-bold text-foreground tabular-nums">{request.frozenRate.toFixed(2)} ₽</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Заморожено на балансе
              </span>
              <span className="text-sm font-bold text-foreground tabular-nums">{request.usdtFrozen.toFixed(2)} USDT</span>
            </div>
          </Card>

          {request.attachments && request.attachments.length > 0 && (
            <Card className="p-6 shadow-card gradient-card rounded-lg">
              <p className="text-sm font-bold text-muted-foreground mb-4">Вложение</p>
              <div className="flex flex-wrap gap-2">
                {request.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    {att.type === 'image' && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                    {att.type === 'link' && <LinkIcon className="w-4 h-4 text-muted-foreground" />}
                    {att.type === 'pdf' && <FileText className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm truncate max-w-[150px]">{att.name || att.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5 shadow-md rounded-2xl">
            <p className="text-sm font-medium text-muted-foreground mb-2">Комментарий</p>
            <p className="text-sm text-foreground">{request.comment || '—'}</p>
          </Card>

          <Card className="p-5 shadow-md rounded-2xl">
            <p className="text-sm font-medium text-muted-foreground mb-2">Создано</p>
            <p className="text-sm text-foreground">
              {new Date(request.createdAt).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </Card>

          {request.receipt && (
            <Card className="p-6 shadow-card gradient-card rounded-lg">
              <p className="text-sm font-bold text-muted-foreground mb-4">Чек оплаты</p>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{request.receipt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.receipt.type === 'pdf' ? 'PDF документ' : 'Изображение'}
                    </p>
                  </div>
                </div>
                <Button onClick={handleDownloadReceipt} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Скачать
                </Button>
              </div>
            </Card>
          )}

          {request.status === 'submitted' && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="w-full min-h-[52px] rounded-lg font-bold text-destructive hover:text-destructive"
              data-testid="button-cancel-request"
            >
              Отменить заявку
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
