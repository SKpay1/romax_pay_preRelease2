import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Plus, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';
import type { AdminUser, AdminPaymentRequest, AdminDeposit, Operator } from '@/lib/api';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRequest[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  
  const [editBalanceDialog, setEditBalanceDialog] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [addDepositDialog, setAddDepositDialog] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [processPaymentDialog, setProcessPaymentDialog] = useState<{ open: boolean; payment: AdminPaymentRequest | null; details: any | null }>({ open: false, payment: null, details: null });
  const [createOperatorDialog, setCreateOperatorDialog] = useState(false);
  const [operatorLogin, setOperatorLogin] = useState('');
  const [operatorPassword, setOperatorPassword] = useState('');
  
  const [balanceForm, setBalanceForm] = useState({ available: 0, frozen: 0 });
  const [depositAmount, setDepositAmount] = useState(0);
  const [processStatus, setProcessStatus] = useState<'paid' | 'rejected'>('paid');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [editedAmountRub, setEditedAmountRub] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      await api.adminLogin(password);
      setAdminPassword(password);
      setIsAuthenticated(true);
      toast({
        title: 'Успешный вход',
        description: 'Добро пожаловать в админ-панель',
      });
    } catch (error) {
      toast({
        title: 'Ошибка входа',
        description: error instanceof Error ? error.message : 'Неверный пароль',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadUsers = async () => {
    if (!adminPassword) return;
    setIsLoadingUsers(true);
    try {
      const data = await api.adminGetAllUsers(adminPassword);
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить пользователей',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadPayments = async () => {
    if (!adminPassword) return;
    setIsLoadingPayments(true);
    try {
      const filters: { status?: string; urgency?: string } = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (urgencyFilter !== 'all') filters.urgency = urgencyFilter;
      
      const data = await api.adminGetAllPayments(adminPassword, filters);
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

  const loadDeposits = async () => {
    if (!adminPassword) return;
    setIsLoadingDeposits(true);
    try {
      const data = await api.adminGetPendingDeposits(adminPassword);
      setDeposits(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить депозиты',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDeposits(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
      loadPayments();
      loadDeposits();
      loadOperators();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPayments();
    }
  }, [statusFilter, urgencyFilter]);

  const handleUpdateBalance = async () => {
    if (!editBalanceDialog.user || !adminPassword) return;
    
    try {
      await api.adminUpdateUserBalance(
        adminPassword,
        editBalanceDialog.user.id,
        balanceForm.available,
        balanceForm.frozen
      );
      
      toast({
        title: 'Успешно',
        description: 'Баланс пользователя обновлен',
      });
      
      setEditBalanceDialog({ open: false, user: null });
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить баланс',
        variant: 'destructive',
      });
    }
  };

  const handleAddDeposit = async () => {
    if (!addDepositDialog.user || !adminPassword) return;
    
    try {
      await api.adminAddDeposit(
        adminPassword,
        addDepositDialog.user.id,
        depositAmount
      );
      
      toast({
        title: 'Успешно',
        description: `Добавлено ${depositAmount} USDT`,
      });
      
      setAddDepositDialog({ open: false, user: null });
      setDepositAmount(0);
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить депозит',
        variant: 'destructive',
      });
    }
  };

  const handleApprovePayment = async (requestId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminApprovePayment(adminPassword, requestId);
      
      toast({
        title: 'Успешно',
        description: 'Заявка одобрена',
      });
      
      loadPayments();
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось одобрить заявку',
        variant: 'destructive',
      });
    }
  };

  const handleCancelPayment = async (requestId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminCancelPayment(adminPassword, requestId);
      
      toast({
        title: 'Успешно',
        description: 'Заявка отменена',
      });
      
      loadPayments();
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отменить заявку',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDeposit = async (depositId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminConfirmDeposit(adminPassword, depositId);
      
      toast({
        title: 'Успешно',
        description: 'Депозит подтверждён',
      });
      
      loadDeposits();
      loadUsers();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось подтвердить депозит',
        variant: 'destructive',
      });
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    if (!adminPassword) return;
    
    try {
      await api.adminRejectDeposit(adminPassword, depositId);
      
      toast({
        title: 'Успешно',
        description: 'Депозит отклонён',
      });
      
      loadDeposits();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отклонить депозит',
        variant: 'destructive',
      });
    }
  };

  const loadOperators = async () => {
    if (!adminPassword) return;
    setIsLoadingOperators(true);
    try {
      const data = await api.adminGetAllOperators(adminPassword);
      setOperators(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить операторов',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingOperators(false);
    }
  };

  const handleCreateOperator = async () => {
    if (!adminPassword || !operatorLogin || !operatorPassword) return;
    
    try {
      await api.adminCreateOperator(adminPassword, operatorLogin, operatorPassword);
      
      toast({
        title: 'Успешно',
        description: 'Оператор создан',
      });
      
      setCreateOperatorDialog(false);
      setOperatorLogin('');
      setOperatorPassword('');
      loadOperators();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать оператора',
        variant: 'destructive',
      });
    }
  };

  const handleToggleOperatorStatus = async (operatorId: string, currentStatus: boolean) => {
    if (!adminPassword) return;
    
    try {
      await api.adminUpdateOperatorStatus(adminPassword, operatorId, !currentStatus);
      
      toast({
        title: 'Успешно',
        description: `Оператор ${!currentStatus ? 'активирован' : 'деактивирован'}`,
      });
      
      loadOperators();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить статус',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOperator = async (operatorId: string) => {
    if (!adminPassword || !confirm('Удалить оператора?')) return;
    
    try {
      await api.adminDeleteOperator(adminPassword, operatorId);
      
      toast({
        title: 'Успешно',
        description: 'Оператор удалён',
      });
      
      loadOperators();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить оператора',
        variant: 'destructive',
      });
    }
  };

  const handleViewPaymentDetails = async (payment: AdminPaymentRequest) => {
    if (!adminPassword) return;
    
    try {
      const details = await api.adminGetPaymentRequest(adminPassword, payment.id);
      setProcessPaymentDialog({ open: true, payment, details });
      setProcessStatus('paid');
      setReceiptFile(null);
      setAdminComment('');
      setEditedAmountRub(null);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить детали заявки',
        variant: 'destructive',
      });
    }
  };

  const handleProcessPayment = async () => {
    if (!adminPassword || !processPaymentDialog.payment) return;
    
    setIsProcessing(true);
    
    try {
      let receipt = undefined;
      
      if (receiptFile) {
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
          type: receiptFile.type.includes('pdf') ? 'pdf' as const : 'image' as const,
          value: base64,
          name: receiptFile.name,
          mimeType: receiptFile.type,
        };
      }
      
      await api.adminProcessPaymentRequest(
        adminPassword,
        processPaymentDialog.payment.id,
        processStatus,
        receipt,
        adminComment || undefined,
        editedAmountRub ?? undefined
      );
      
      toast({
        title: 'Успешно',
        description: `Заявка ${processStatus === 'paid' ? 'оплачена' : 'отклонена'}`,
      });
      
      setProcessPaymentDialog({ open: false, payment: null, details: null });
      setReceiptFile(null);
      setAdminComment('');
      setEditedAmountRub(null);
      loadPayments();
      loadUsers();
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

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Ошибка',
          description: 'Поддерживаются только PDF, JPG и PNG файлы',
          variant: 'destructive',
        });
        return;
      }
      setReceiptFile(file);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-600';
      case 'processing': return 'text-yellow-600';
      case 'paid': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      case 'pending': return 'text-yellow-600';
      case 'confirmed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Подана';
      case 'processing': return 'В обработке';
      case 'paid': return 'Оплачена';
      case 'rejected': return 'Отклонена';
      case 'cancelled': return 'Отменена';
      case 'pending': return 'Ожидает';
      case 'confirmed': return 'Подтверждён';
      default: return status;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-[18px] shadow-soft-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Админ-панель</h1>
              <p className="text-muted-foreground">Введите пароль для входа</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
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
          </div>
        </div>
      </div>
    );
  }

  const activePayments = payments.filter(p => p.status === 'submitted' || p.status === 'processing');
  const historyPayments = payments.filter(p => p.status === 'paid' || p.status === 'rejected' || p.status === 'cancelled');

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Админ-панель</h1>
          <Button 
            variant="outline" 
            onClick={() => setIsAuthenticated(false)}
            className="rounded-[12px]"
          >
            Выйти
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card shadow-soft-sm rounded-[18px] p-1">
            <TabsTrigger 
              value="users" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Пользователи
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Платежи
            </TabsTrigger>
            <TabsTrigger 
              value="deposits" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Депозиты
            </TabsTrigger>
            <TabsTrigger 
              value="operators" 
              className="rounded-[14px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft-sm font-semibold transition-soft"
            >
              Операторы
            </TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Пользователи</h2>
              <Button onClick={loadUsers} variant="outline" disabled={isLoadingUsers}>
                {isLoadingUsers ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>Имя пользователя</TableHead>
                    <TableHead>Доступно</TableHead>
                    <TableHead>Заморожено</TableHead>
                    <TableHead>Регистрация</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}...</TableCell>
                      <TableCell>{user.telegramId}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.availableBalance.toFixed(2)} USDT</TableCell>
                      <TableCell>{user.frozenBalance.toFixed(2)} USDT</TableCell>
                      <TableCell className="text-sm">{formatDate(user.registeredAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditBalanceDialog({ open: true, user });
                              setBalanceForm({
                                available: user.availableBalance,
                                frozen: user.frozenBalance,
                              });
                            }}
                          >
                            Изменить баланс
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddDepositDialog({ open: true, user });
                              setDepositAmount(0);
                            }}
                          >
                            Добавить депозит
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Заявки на выплату</h2>
              <div className="flex gap-2 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="submitted">Подана</SelectItem>
                    <SelectItem value="processing">В обработке</SelectItem>
                    <SelectItem value="paid">Оплачена</SelectItem>
                    <SelectItem value="cancelled">Отменена</SelectItem>
                    <SelectItem value="rejected">Отклонена</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Срочность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="urgent">Срочные</SelectItem>
                    <SelectItem value="standard">Обычные</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={loadPayments} variant="outline" disabled={isLoadingPayments}>
                  {isLoadingPayments ? 'Загрузка...' : 'Обновить'}
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Сумма (₽)</TableHead>
                    <TableHead>USDT</TableHead>
                    <TableHead>Курс</TableHead>
                    <TableHead>Срочность</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Создана</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                      <TableCell>{payment.username}</TableCell>
                      <TableCell>{payment.amountRub.toLocaleString('ru-RU')} ₽</TableCell>
                      <TableCell>{payment.amountUsdt.toFixed(2)} USDT</TableCell>
                      <TableCell>{payment.frozenRate.toFixed(2)}</TableCell>
                      <TableCell>
                        {payment.urgency === 'urgent' ? (
                          <span className="text-red-600 font-semibold">Срочно</span>
                        ) : (
                          <span className="text-gray-600">Обычно</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={getStatusColor(payment.status)}>
                          {getStatusText(payment.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(payment.createdAt)}</TableCell>
                      <TableCell>
                        {payment.status === 'submitted' || payment.status === 'processing' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPaymentDetails(payment)}
                            >
                              Детали
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprovePayment(payment.id)}
                            >
                              Одобрить
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelPayment(payment.id)}
                            >
                              Отменить
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPaymentDetails(payment)}
                          >
                            Просмотр
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* DEPOSITS TAB */}
          <TabsContent value="deposits" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Депозиты</h2>
              <Button onClick={loadDeposits} variant="outline" disabled={isLoadingDeposits}>
                {isLoadingDeposits ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Сумма USDT</TableHead>
                    <TableHead>TX Hash</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Нет ожидающих депозитов
                      </TableCell>
                    </TableRow>
                  ) : (
                    deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell className="font-mono text-xs">{deposit.id.slice(0, 8)}...</TableCell>
                        <TableCell>{deposit.username}</TableCell>
                        <TableCell className="font-semibold">{deposit.amount.toFixed(2)} USDT</TableCell>
                        <TableCell className="font-mono text-xs">
                          {deposit.txHash ? (
                            <span title={deposit.txHash}>{deposit.txHash.slice(0, 10)}...</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(deposit.createdAt)}</TableCell>
                        <TableCell>
                          <span className={getStatusColor(deposit.status)}>
                            {getStatusText(deposit.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {deposit.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleConfirmDeposit(deposit.id)}
                              >
                                Подтвердить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectDeposit(deposit.id)}
                              >
                                Отклонить
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Нет действий</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* OPERATORS TAB */}
          <TabsContent value="operators" className="space-y-4 mt-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Операторы</h2>
              <div className="flex gap-2">
                <Button onClick={loadOperators} variant="outline" disabled={isLoadingOperators} className="rounded-[12px]">
                  {isLoadingOperators ? 'Загрузка...' : 'Обновить'}
                </Button>
                <Button onClick={() => setCreateOperatorDialog(true)} className="rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Создать оператора
                </Button>
              </div>
            </div>
            
            <div className="border rounded-[18px] overflow-hidden shadow-soft bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-semibold text-foreground">ID</TableHead>
                    <TableHead className="font-semibold text-foreground">Логин</TableHead>
                    <TableHead className="font-semibold text-foreground">Статус</TableHead>
                    <TableHead className="font-semibold text-foreground">Создан</TableHead>
                    <TableHead className="font-semibold text-foreground">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Операторов пока нет</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    operators.map((operator) => (
                      <TableRow key={operator.id} className="border-border">
                        <TableCell className="font-mono text-xs text-muted-foreground">{operator.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-semibold text-foreground">{operator.login}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${operator.isActive ? 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
                            <span className={`w-2 h-2 rounded-full ${operator.isActive ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`}></span>
                            {operator.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(operator.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleOperatorStatus(operator.id, operator.isActive)}
                              className="rounded-[10px]"
                            >
                              {operator.isActive ? 'Деактивировать' : 'Активировать'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOperator(operator.id)}
                              className="rounded-[10px]"
                            >
                              Удалить
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Balance Dialog */}
      <Dialog open={editBalanceDialog.open} onOpenChange={(open) => setEditBalanceDialog({ open, user: editBalanceDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить баланс</DialogTitle>
            <DialogDescription>
              Пользователь: {editBalanceDialog.user?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="available">Доступный баланс (USDT)</Label>
              <Input
                id="available"
                type="number"
                step="0.01"
                value={balanceForm.available}
                onChange={(e) => setBalanceForm({ ...balanceForm, available: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div>
              <Label htmlFor="frozen">Замороженный баланс (USDT)</Label>
              <Input
                id="frozen"
                type="number"
                step="0.01"
                value={balanceForm.frozen}
                onChange={(e) => setBalanceForm({ ...balanceForm, frozen: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBalanceDialog({ open: false, user: null })}>
              Отмена
            </Button>
            <Button onClick={handleUpdateBalance}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deposit Dialog */}
      <Dialog open={addDepositDialog.open} onOpenChange={(open) => setAddDepositDialog({ open, user: addDepositDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить депозит</DialogTitle>
            <DialogDescription>
              Пользователь: {addDepositDialog.user?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="deposit-amount">Сумма (USDT)</Label>
              <Input
                id="deposit-amount"
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                placeholder="Введите сумму"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDepositDialog({ open: false, user: null })}>
              Отмена
            </Button>
            <Button onClick={handleAddDeposit}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog open={processPaymentDialog.open} onOpenChange={(open) => setProcessPaymentDialog({ open, payment: processPaymentDialog.payment, details: processPaymentDialog.details })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Обработка заявки №{processPaymentDialog.payment?.id.slice(-6)}</DialogTitle>
            <DialogDescription>
              Пользователь: {processPaymentDialog.payment?.username}
            </DialogDescription>
          </DialogHeader>
          
          {processPaymentDialog.details && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Сумма (₽)</Label>
                  <p className="text-2xl font-bold">{processPaymentDialog.payment?.amountRub.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">USDT</Label>
                  <p className="text-2xl font-bold">{processPaymentDialog.payment?.amountUsdt.toFixed(2)} USDT</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Курс</Label>
                  <p className="font-medium">{processPaymentDialog.payment?.frozenRate.toFixed(2)} ₽</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Срочность</Label>
                  <p className="font-medium">{processPaymentDialog.payment?.urgency === 'urgent' ? 'Срочно' : 'Стандартно'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Статус</Label>
                <p className="font-medium capitalize">{getStatusText(processPaymentDialog.payment?.status || '')}</p>
              </div>

              {processPaymentDialog.details.comment && (
                <div>
                  <Label className="text-muted-foreground">Комментарий</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{processPaymentDialog.details.comment}</p>
                </div>
              )}

              {processPaymentDialog.details.attachments && processPaymentDialog.details.attachments.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Вложения ({processPaymentDialog.details.attachments.length})</Label>
                  <div className="mt-2 space-y-2">
                    {processPaymentDialog.details.attachments.map((att: any, idx: number) => {
                      if (att.type === 'image' && att.value) {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">Изображение: {att.name || 'image.jpg'}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadBase64File(att.value, att.name || 'image.jpg', 'image/jpeg')}
                                className="border-2 border-black"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Скачать
                              </Button>
                            </div>
                            <img 
                              src={att.value.startsWith('data:') ? att.value : `data:image/jpeg;base64,${att.value}`}
                              alt={att.name || 'Вложение'}
                              className="max-w-full h-auto rounded border-2 border-black"
                              style={{ maxHeight: '400px' }}
                            />
                          </div>
                        );
                      } else if (att.type === 'pdf' && att.value) {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">PDF: {att.name || 'document.pdf'}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadBase64File(att.value, att.name || 'document.pdf', 'application/pdf')}
                                className="border-2 border-black"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Скачать
                              </Button>
                            </div>
                            <iframe 
                              src={att.value.startsWith('data:') ? att.value : `data:application/pdf;base64,${att.value}`}
                              className="w-full border-2 border-black rounded"
                              style={{ maxHeight: '500px' }}
                              title={att.name || 'PDF'}
                            />
                          </div>
                        );
                      } else if (att.type === 'link') {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md text-sm">
                            <span className="font-medium">Ссылка:</span>{' '}
                            <a href={att.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {att.name || att.value}
                            </a>
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx} className="p-2 bg-muted rounded-md text-sm">
                            <span className="font-medium">{att.type.toUpperCase()}:</span> {att.name || att.value}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}

              {processPaymentDialog.details.receipt && (
                <div>
                  <Label className="text-muted-foreground">Чек оператора</Label>
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    {processPaymentDialog.details.receipt.type === 'image' ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium">{processPaymentDialog.details.receipt.name || 'receipt.jpg'}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBase64File(
                              processPaymentDialog.details.receipt.value,
                              processPaymentDialog.details.receipt.name || 'receipt.jpg',
                              processPaymentDialog.details.receipt.mimeType || 'image/jpeg'
                            )}
                            className="border-2 border-black"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Скачать
                          </Button>
                        </div>
                        <img 
                          src={`data:${processPaymentDialog.details.receipt.mimeType || 'image/jpeg'};base64,${processPaymentDialog.details.receipt.value}`}
                          alt="Чек"
                          className="max-w-full h-auto rounded border-2 border-black"
                          style={{ maxHeight: '400px' }}
                        />
                      </>
                    ) : processPaymentDialog.details.receipt.type === 'pdf' ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium">{processPaymentDialog.details.receipt.name || 'receipt.pdf'}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBase64File(
                              processPaymentDialog.details.receipt.value,
                              processPaymentDialog.details.receipt.name || 'receipt.pdf',
                              processPaymentDialog.details.receipt.mimeType || 'application/pdf'
                            )}
                            className="border-2 border-black"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Скачать
                          </Button>
                        </div>
                        <iframe 
                          src={`data:${processPaymentDialog.details.receipt.mimeType || 'application/pdf'};base64,${processPaymentDialog.details.receipt.value}`}
                          className="w-full border-2 border-black rounded"
                          style={{ maxHeight: '500px' }}
                          title="Чек (PDF)"
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {processPaymentDialog.details.adminComment && (
                <div>
                  <Label className="text-muted-foreground">Комментарий оператора</Label>
                  <p className="mt-1 p-3 bg-yellow-100 border-2 border-black rounded-md font-medium">{processPaymentDialog.details.adminComment}</p>
                </div>
              )}

              {(processPaymentDialog.payment?.status === 'submitted' || processPaymentDialog.payment?.status === 'processing') && (
                <>
                  <div className="border-t pt-6 space-y-4">
                    <div>
                      <Label htmlFor="edit-amount">Изменить сумму (₽) - необязательно</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        placeholder={processPaymentDialog.payment?.amountRub.toFixed(2)}
                        value={editedAmountRub ?? ''}
                        onChange={(e) => setEditedAmountRub(e.target.value ? parseFloat(e.target.value) : null)}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Оригинальная сумма: {processPaymentDialog.payment?.amountRub.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="process-status">Статус</Label>
                      <Select value={processStatus} onValueChange={(value) => setProcessStatus(value as 'paid' | 'rejected')}>
                        <SelectTrigger id="process-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Оплачено</SelectItem>
                          <SelectItem value="rejected">Отклонено</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="admin-comment">Комментарий оператора (необязательно)</Label>
                      <Input
                        id="admin-comment"
                        type="text"
                        placeholder="Например: причина отказа или примечание"
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="receipt-upload">Чек / Квитанция (необязательно)</Label>
                      <Input
                        id="receipt-upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleReceiptFileChange}
                        className="mt-1"
                      />
                      {receiptFile && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Выбран файл: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setProcessPaymentDialog({ open: false, payment: null, details: null })}>
                      Отмена
                    </Button>
                    <Button onClick={handleProcessPayment} disabled={isProcessing}>
                      {isProcessing ? 'Обработка...' : 'Подтвердить'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Operator Dialog */}
      <Dialog open={createOperatorDialog} onOpenChange={setCreateOperatorDialog}>
        <DialogContent className="bg-card rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">Создать оператора</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Введите данные нового оператора
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="operator-login" className="text-foreground font-semibold">Логин</Label>
              <Input
                id="operator-login"
                type="text"
                value={operatorLogin}
                onChange={(e) => setOperatorLogin(e.target.value)}
                placeholder="Введите логин"
                className="mt-2 rounded-[12px]"
              />
            </div>
            
            <div>
              <Label htmlFor="operator-password" className="text-foreground font-semibold">Пароль</Label>
              <Input
                id="operator-password"
                type="password"
                value={operatorPassword}
                onChange={(e) => setOperatorPassword(e.target.value)}
                placeholder="Введите пароль"
                className="mt-2 rounded-[12px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateOperatorDialog(false);
                setOperatorLogin('');
                setOperatorPassword('');
              }}
              className="rounded-[12px]"
            >
              Отмена
            </Button>
            <Button 
              onClick={handleCreateOperator}
              disabled={!operatorLogin || !operatorPassword}
              className="rounded-[12px] bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft-sm"
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
