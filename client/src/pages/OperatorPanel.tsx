import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentRequest {
  id: string;
  userId: string;
  username: string;
  amountRub: number;
  amountUsdt: number;
  frozenRate: number;
  urgency: string;
  status: string;
  createdAt: string;
  comment?: string;
  adminComment?: string;
  attachments?: Array<{type: string; value: string; name?: string}>;
  receipt?: {type: string; value: string; name: string; mimeType: string};
}

const statusColors: Record<string, string> = {
  submitted: 'bg-primary text-foreground',
  processing: 'bg-secondary text-foreground',
  paid: 'bg-[hsl(var(--success))] text-white',
  rejected: 'bg-destructive text-white',
  cancelled: 'bg-muted text-foreground',
};

const statusLabels: Record<string, string> = {
  submitted: 'ОТПРАВЛЕНА',
  processing: 'В ОБРАБОТКЕ',
  paid: 'ОПЛАЧЕНО',
  rejected: 'ОТКЛОНЕНО',
  cancelled: 'ОТМЕНЕНО',
};

const statusIcons: Record<string, any> = {
  submitted: AlertCircle,
  processing: Clock,
  paid: Check,
  rejected: X,
  cancelled: X,
};

export default function OperatorPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [operatorLogin, setOperatorLogin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [processDialog, setProcessDialog] = useState(false);
  const [processStatus, setProcessStatus] = useState<'paid' | 'rejected' | 'processing'>('processing');
  const [adminComment, setAdminComment] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const response = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка входа');
      }

      const data = await response.json();
      setOperatorId(data.id);
      setOperatorLogin(data.login);
      setIsAuthenticated(true);
      
      toast({
        title: 'Успешный вход',
        description: `Добро пожаловать, ${data.login}`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка входа',
        description: error instanceof Error ? error.message : 'Неверный логин или пароль',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadPayments = async () => {
    if (!operatorId) return;
    
    setIsLoadingPayments(true);
    try {
      const response = await fetch(`/api/operator/${operatorId}/payments`);
      if (!response.ok) throw new Error('Ошибка загрузки заявок');
      
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заявки',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && operatorId) {
      loadPayments();
      const interval = setInterval(loadPayments, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, operatorId]);

  const handleProcessPayment = async () => {
    if (!selectedPayment || !operatorId) return;
    
    setIsProcessing(true);
    
    try {
      let receipt = undefined;
      
      if (receiptFile && processStatus === 'paid') {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(receiptFile);
        });
        
        receipt = {
          type: receiptFile.type.includes('pdf') ? 'pdf' : 'image',
          value: base64,
          name: receiptFile.name,
          mimeType: receiptFile.type,
        };
      }

      const response = await fetch(`/api/operator/${operatorId}/payments/${selectedPayment.id}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: processStatus,
          adminComment: adminComment || undefined,
          receipt,
        }),
      });

      if (!response.ok) throw new Error('Ошибка обработки заявки');

      toast({
        title: 'Успешно',
        description: `Заявка ${processStatus === 'paid' ? 'оплачена' : processStatus === 'rejected' ? 'отклонена' : 'взята в обработку'}`,
      });

      setProcessDialog(false);
      setSelectedPayment(null);
      setAdminComment('');
      setReceiptFile(null);
      loadPayments();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обработать заявку',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadBase64File = (base64Data: string, fileName: string, mimeType: string) => {
    const dataUrl = base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activePayments = payments.filter(p => p.status === 'submitted' || p.status === 'processing');
  const historyPayments = payments.filter(p => p.status === 'paid' || p.status === 'rejected' || p.status === 'cancelled');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-soft-lg bg-card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Панель оператора</h1>
            <p className="text-muted-foreground">Введите данные для входа</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="login" className="text-foreground font-semibold">Логин</Label>
              <Input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Введите логин"
                required
                className="mt-2 rounded-[12px] border-border"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-foreground font-semibold">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                className="mt-2 rounded-[12px] border-border"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm font-semibold py-6" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Панель оператора</h1>
            <p className="text-muted-foreground mt-1">Оператор: {operatorLogin}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsAuthenticated(false)}
            className="rounded-[12px]"
          >
            Выйти
          </Button>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card shadow-soft-sm rounded-[18px] p-1 mb-6">
            <TabsTrigger 
              value="active" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Активные заявки ({activePayments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              История ({historyPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 animate-fade-in">
            {isLoadingPayments ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <p className="text-muted-foreground">Загрузка...</p>
              </Card>
            ) : activePayments.length === 0 ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Нет активных заявок</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activePayments.map((payment) => {
                  const StatusIcon = statusIcons[payment.status];
                  return (
                    <Card key={payment.id} className="p-6 bg-card shadow-soft hover-lift transition-soft cursor-pointer" onClick={() => {
                      setSelectedPayment(payment);
                      setProcessDialog(true);
                      setProcessStatus('processing');
                      setAdminComment('');
                      setReceiptFile(null);
                    }}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Пользователь</p>
                          <p className="text-lg font-bold text-foreground">{payment.username}</p>
                        </div>
                        <Badge className={`${statusColors[payment.status]} rounded-full text-xs font-semibold px-3 py-2 shadow-soft-sm flex items-center gap-2`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusLabels[payment.status]}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Сумма</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{payment.amountRub.toLocaleString('ru-RU')} ₽</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">USDT</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{payment.amountUsdt.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground border-t border-border pt-4">
                        <p>Курс: {payment.frozenRate.toFixed(2)} ₽</p>
                        <p>Срочность: {payment.urgency === 'urgent' ? '⚡ Срочно' : '⏱️ Стандартно'}</p>
                        <p>Создана: {formatDate(payment.createdAt)}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 animate-fade-in">
            {historyPayments.length === 0 ? (
              <Card className="p-12 text-center bg-card shadow-soft">
                <Check className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">История пуста</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {historyPayments.map((payment) => {
                  const StatusIcon = statusIcons[payment.status];
                  return (
                    <Card key={payment.id} className="p-6 bg-card shadow-soft">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Пользователь</p>
                          <p className="text-lg font-bold text-foreground">{payment.username}</p>
                        </div>
                        <Badge className={`${statusColors[payment.status]} rounded-full text-xs font-semibold px-3 py-2 shadow-soft-sm flex items-center gap-2`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusLabels[payment.status]}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Сумма</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{payment.amountRub.toLocaleString('ru-RU')} ₽</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">USDT</p>
                          <p className="text-2xl font-bold tabular-nums text-foreground">{payment.amountUsdt.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground border-t border-border pt-4">
                        <p>Создана: {formatDate(payment.createdAt)}</p>
                        {payment.adminComment && (
                          <p className="mt-2 text-foreground">💬 Комментарий: {payment.adminComment}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={processDialog} onOpenChange={setProcessDialog}>
          <DialogContent className="max-w-2xl bg-card rounded-[18px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">Обработка заявки</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedPayment?.username} • {selectedPayment?.amountRub.toLocaleString('ru-RU')} ₽
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground font-semibold">Сумма (₽)</Label>
                    <p className="text-2xl font-bold tabular-nums mt-2">{selectedPayment.amountRub.toLocaleString('ru-RU')}</p>
                  </div>
                  <div>
                    <Label className="text-foreground font-semibold">USDT</Label>
                    <p className="text-2xl font-bold tabular-nums mt-2">{selectedPayment.amountUsdt.toFixed(2)}</p>
                  </div>
                </div>

                {selectedPayment.comment && (
                  <div>
                    <Label className="text-foreground font-semibold">Комментарий пользователя</Label>
                    <p className="text-muted-foreground mt-2">{selectedPayment.comment}</p>
                  </div>
                )}

                {selectedPayment.attachments && selectedPayment.attachments.length > 0 && (
                  <div>
                    <Label className="text-foreground font-semibold">Вложения</Label>
                    <div className="mt-2 space-y-2">
                      {selectedPayment.attachments.map((att, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {att.type === 'link' ? (
                            <a href={att.value} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              {att.name || att.value}
                            </a>
                          ) : (
                            <span>{att.name || `Файл ${idx + 1}`}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="status" className="text-foreground font-semibold">Статус</Label>
                  <Select value={processStatus} onValueChange={(v: any) => setProcessStatus(v)}>
                    <SelectTrigger className="mt-2 rounded-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">В обработке</SelectItem>
                      <SelectItem value="paid">Оплачено</SelectItem>
                      <SelectItem value="rejected">Отклонено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {processStatus === 'paid' && (
                  <div>
                    <Label htmlFor="receipt" className="text-foreground font-semibold">Чек (необязательно)</Label>
                    <Input
                      id="receipt"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="mt-2 rounded-[12px]"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="comment" className="text-foreground font-semibold">Комментарий (необязательно)</Label>
                  <Textarea
                    id="comment"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Добавьте комментарий..."
                    className="mt-2 rounded-[12px]"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setProcessDialog(false)}
                className="rounded-[12px]"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleProcessPayment} 
                disabled={isProcessing}
                className="rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm"
              >
                {isProcessing ? 'Обработка...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
