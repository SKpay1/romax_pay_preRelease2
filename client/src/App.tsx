import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as api from "./lib/api";

import WelcomePage from "@/components/WelcomePage";
import DashboardPage from "@/components/DashboardPage";
import TopUpPage from "@/components/TopUpPage";
import PayPage, { type PaymentDraft } from "@/components/PayPage";
import HistoryPage from "@/components/HistoryPage";
import RequestDetailPage from "@/components/RequestDetailPage";
import InstructionsPage from "@/components/InstructionsPage";
import SettingsPage from "@/components/SettingsPage";
import BottomNavigation from "@/components/BottomNavigation";
import AdminPanel from "@/pages/AdminPanel";
import OperatorPanel from "@/pages/OperatorPanel";

type Tab = 'home' | 'history' | 'instructions' | 'settings';
type HomeView = 'dashboard' | 'topup' | 'pay';
type HistoryView = 'list' | 'detail';

export interface Transaction {
  id: string;
  type: 'payment' | 'deposit';
  amountRub: number;
  amountUsdt: number;
  frozenRate?: number;
  urgency?: 'urgent' | 'standard';
  hasUrgentFee?: boolean;
  usdtFrozen?: number;
  attachments?: Array<{type: 'image' | 'link' | 'pdf' | 'doc' | 'docx'; value: string; name?: string}>;
  comment?: string;
  status: 'submitted' | 'processing' | 'paid' | 'rejected' | 'cancelled' | 'pending' | 'confirmed';
  createdAt: string;
  receipt?: {type: 'pdf' | 'image'; value: string; name: string; mimeType: string};
  txHash?: string;
  confirmedAt?: string;
  payableAmount?: number;
  expiresAt?: string;
  requestedAmount?: number;
  walletAddress?: string;
}

export interface Notification {
  id: string;
  requestId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [homeView, setHomeView] = useState<HomeView>('dashboard');
  const [historyView, setHistoryView] = useState<HistoryView>('list');
  const [availableUsdt, setAvailableUsdt] = useState(0);
  const [frozenUsdt, setFrozenUsdt] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(90);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [registeredAt, setRegisteredAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const walletAddress = import.meta.env.VITE_TRC20_WALLET || "TX1111111111111111111111";

  const totalUsdt = availableUsdt + frozenUsdt;

  // Check if on admin or operator route
  const isAdminRoute = window.location.pathname === '/admin';
  const isOperatorRoute = window.location.pathname === '/operator';

  // Helper function to load all transactions (payments + deposits)
  const loadAllTransactions = async (userId: string, currentRate?: number) => {
    try {
      // Load payment requests
      const payments = await api.getUserPaymentRequests(userId);
      const paymentTransactions: Transaction[] = payments.map((p: any) => ({
        ...p,
        type: 'payment' as const,
      }));

      // Load deposits
      const deposits = await api.getUserDeposits(userId);
      const rate = currentRate || exchangeRate || 80;
      const depositTransactions: Transaction[] = deposits.map((d: any) => ({
        id: d.id,
        type: 'deposit' as const,
        amountRub: d.amount * rate,
        amountUsdt: d.amount,
        status: d.status === 'confirmed' ? 'paid' : d.status,
        createdAt: d.createdAt,
        txHash: d.txHash,
        confirmedAt: d.confirmedAt,
        payableAmount: d.payableAmount ? parseFloat(d.payableAmount) : undefined,
        expiresAt: d.expiresAt,
        requestedAmount: d.requestedAmount ? parseFloat(d.requestedAmount) : undefined,
        walletAddress: d.walletAddress,
      }));

      // Combine and sort by date
      const allTransactions = [...paymentTransactions, ...depositTransactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  // Initialize Telegram WebApp and authenticate user
  useEffect(() => {
    const initializeApp = async () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Set theme colors (optional methods, available in newer Telegram versions)
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        if (tg.setHeaderColor) tg.setHeaderColor('bg_color');
        if (tg.setBackgroundColor) tg.setBackgroundColor('bg_color');

        // Get user data from Telegram
        const tgUser = tg.initDataUnsafe?.user;
        const initData = tg.initData;
        
        if (tgUser && initData) {
          try {
            // Authenticate with backend using validated initData
            const user = await api.authenticateUser(
              tgUser.id,
              tgUser.username || tgUser.first_name || `user_${tgUser.id}`,
              initData
            );

            setUserId(user.id);
            setUsername(user.username);
            setRegisteredAt(user.registeredAt);
            setAvailableUsdt(user.availableBalance);
            setFrozenUsdt(user.frozenBalance);

            // Load all transactions (payments + deposits)
            await loadAllTransactions(user.id);

            // Load notifications
            const notifs = await api.getUserNotifications(user.id);
            setNotifications(notifs);
          } catch (error) {
            console.error('Failed to authenticate:', error);
          }
        } else {
          // Fallback for testing outside Telegram (use demo user)
          console.log('Running outside Telegram, using demo mode');
          try {
            const user = await api.authenticateUser(12345, 'demo_user');
            setUserId(user.id);
            setUsername(user.username);
            setRegisteredAt(user.registeredAt);
            setAvailableUsdt(user.availableBalance);
            setFrozenUsdt(user.frozenBalance);

            await loadAllTransactions(user.id);

            const notifs = await api.getUserNotifications(user.id);
            setNotifications(notifs);
          } catch (error) {
            console.error('Failed to initialize demo mode:', error);
          }
        }
      } else {
        // Running outside Telegram completely
        console.log('Telegram WebApp not available, using demo mode');
        try {
          const user = await api.authenticateUser(12345, 'demo_user');
          setUserId(user.id);
          setUsername(user.username);
          setRegisteredAt(user.registeredAt);
          setAvailableUsdt(user.availableBalance);
          setFrozenUsdt(user.frozenBalance);

          const requests = await api.getUserPaymentRequests(user.id);
          setTransactions(requests as Transaction[]);

          const notifs = await api.getUserNotifications(user.id);
          setNotifications(notifs);
        } catch (error) {
          console.error('Failed to initialize:', error);
        }
      }

      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // Fetch exchange rate periodically
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const rateData = await api.getExchangeRate();
        setExchangeRate(rateData.rate);
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      }
    };

    fetchRate();
    const interval = setInterval(fetchRate, 5000);
    return () => clearInterval(interval);
  }, []);

  // Refresh balance periodically
  useEffect(() => {
    if (!userId) return;

    const refreshBalance = async () => {
      try {
        const balance = await api.getUserBalance(userId);
        setAvailableUsdt(balance.availableBalance);
        setFrozenUsdt(balance.frozenBalance);
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    };

    const interval = setInterval(refreshBalance, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleTopUpComplete = async (amount: number) => {
    if (!userId) return;
    
    // Simulate top-up (in real app, this would be handled by backend after deposit confirmation)
    setAvailableUsdt(prev => prev + amount);
    
    // Refresh from server
    try {
      const balance = await api.getUserBalance(userId);
      setAvailableUsdt(balance.availableBalance);
      setFrozenUsdt(balance.frozenBalance);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  const handlePaymentSubmit = async (data: PaymentDraft) => {
    if (!userId) {
      console.error('Payment submit failed: userId is missing');
      alert('Не удалось создать заявку. Попробуйте снова.');
      return;
    }

    try {
      const requestData = {
        userId,
        amountRub: data.amountRub,
        amountUsdt: data.amountUsdt,
        frozenRate: data.frozenRate,
        urgency: data.urgency,
        attachments: data.attachments,
        comment: data.comment,
      };

      console.log('Creating payment request with data:', {
        userId,
        amountRub: data.amountRub,
        amountUsdt: data.amountUsdt,
        frozenRate: data.frozenRate,
        urgency: data.urgency,
        attachmentsCount: data.attachments.length,
        attachmentsTypes: data.attachments.map(a => ({ type: a.type, hasValue: !!a.value, valueLength: a.value?.length })),
        comment: data.comment,
      });

      const request = await api.createPaymentRequest(requestData);

      console.log('Payment request created successfully:', request);

      // Add to local state
      setTransactions(prev => [request as Transaction, ...prev]);
      setAvailableUsdt(prev => prev - data.amountUsdt);
      setFrozenUsdt(prev => prev + data.amountUsdt);
      setPaymentDraft(null);
      setHomeView('dashboard');

      // Refresh notifications
      const notifs = await api.getUserNotifications(userId);
      setNotifications(notifs);
    } catch (error) {
      console.error('Failed to create payment request - Detailed error:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      if (error instanceof Error) {
        alert(`Не удалось создать заявку. Ошибка: ${error.message}`);
      } else {
        alert('Не удалось создать заявку. Попробуйте снова.');
      }
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await api.updatePaymentRequestStatus(requestId, 'cancelled');

      // Update local state
      setTransactions(prev => prev.map(tx => {
        if (tx.id === requestId) {
          const frozenAmount = tx.usdtFrozen || 0;
          setAvailableUsdt(a => a + frozenAmount);
          setFrozenUsdt(f => f - frozenAmount);
          return { ...tx, status: 'cancelled' as const };
        }
        return tx;
      }));

      // Refresh notifications
      if (userId) {
        const notifs = await api.getUserNotifications(userId);
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleClearData = async () => {
    if (confirm('Вы уверены, что хотите очистить все тестовые данные? Это действие нельзя отменить.')) {
      // In production, this would call an API endpoint to clear user data
      setTransactions([]);
      setNotifications([]);
      setPaymentDraft(null);
      console.log('Данные очищены (только локально в тестовом режиме)');
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      setHistoryView('list');
    }
    if (tab === 'home') {
      setHomeView('dashboard');
    }
  };

  const handleGoHome = () => {
    setActiveTab('home');
    setHomeView('dashboard');
    setPaymentDraft(null);
  };

  const handleViewRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setHistoryView('detail');
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const selectedRequest = selectedRequestId 
    ? transactions.find(t => t.id === selectedRequestId)
    : null;

  // Show admin panel if on /admin route
  if (isAdminRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AdminPanel />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show operator panel if on /operator route
  if (isOperatorRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <OperatorPanel />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase mb-4">Загрузка...</h2>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">

          {/* HOME TAB */}
          {activeTab === 'home' && (
            <>
              {homeView === 'dashboard' && (
                <DashboardPage
                  availableUsdt={availableUsdt}
                  frozenUsdt={frozenUsdt}
                  exchangeRate={exchangeRate}
                  onTopUp={() => setHomeView('topup')}
                  onPay={() => {
                    setHomeView('pay');
                  }}
                  hasDraft={paymentDraft !== null}
                  username={username}
                />
              )}

              {homeView === 'topup' && (
                <TopUpPage
                  userId={userId || undefined}
                  onBack={() => setHomeView('dashboard')}
                  onTopUpComplete={handleTopUpComplete}
                />
              )}

              {homeView === 'pay' && (
                <PayPage
                  exchangeRate={exchangeRate}
                  availableUsdt={availableUsdt}
                  onBack={() => {
                    setHomeView('dashboard');
                  }}
                  onSubmit={handlePaymentSubmit}
                  draft={paymentDraft}
                  onDraftChange={setPaymentDraft}
                />
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <>
              {historyView === 'list' && (
                <HistoryPage 
                  transactions={transactions}
                  onGoHome={handleGoHome}
                  onViewRequest={handleViewRequest}
                />
              )}

              {historyView === 'detail' && selectedRequest && (
                <RequestDetailPage
                  request={selectedRequest}
                  onBack={() => setHistoryView('list')}
                  onCancelRequest={handleCancelRequest}
                />
              )}
            </>
          )}

          {/* INSTRUCTIONS TAB */}
          {activeTab === 'instructions' && (
            <InstructionsPage />
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <SettingsPage
              username={username}
              registeredAt={registeredAt}
              notifications={notifications}
              onClearData={handleClearData}
              onMarkNotificationRead={handleMarkNotificationRead}
            />
          )}

          <BottomNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            unreadCount={notifications.filter(n => !n.isRead).length}
          />

          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
