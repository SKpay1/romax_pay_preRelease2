/**
 * API client for Romax Pay backend
 */

const API_BASE = '/api';

export interface User {
  id: string;
  telegramId: string;
  username: string;
  availableBalance: number;
  frozenBalance: number;
  registeredAt: string;
}

export interface PaymentRequest {
  id: string;
  amountRub: number;
  amountUsdt: number;
  frozenRate: number;
  urgency: string;
  hasUrgentFee: boolean;
  usdtFrozen: number;
  attachments: Array<{type: 'image' | 'link' | 'pdf' | 'doc' | 'docx'; value: string; name?: string}>;
  comment: string;
  status: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  requestId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ExchangeRate {
  rate: number;
  timestamp: string;
  source: string;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  status: string;
  txHash?: string;
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface AdminDeposit extends Deposit {
  username: string;
}

/**
 * Authenticate user via Telegram data
 */
export async function authenticateUser(telegramId: number, username: string, initData?: string): Promise<User> {
  const response = await fetch(`${API_BASE}/user/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      initData,
      telegramId, 
      username 
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to authenticate user');
  }

  return response.json();
}

/**
 * Get user balance
 */
export async function getUserBalance(userId: string): Promise<{ availableBalance: number; frozenBalance: number }> {
  const response = await fetch(`${API_BASE}/user/${userId}/balance`);

  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }

  return response.json();
}

/**
 * Get payment requests for user
 */
export async function getUserPaymentRequests(userId: string): Promise<PaymentRequest[]> {
  const response = await fetch(`${API_BASE}/payments/user/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch payment requests');
  }

  return response.json();
}

/**
 * Get single payment request
 */
export async function getPaymentRequest(requestId: string): Promise<PaymentRequest> {
  const response = await fetch(`${API_BASE}/payments/${requestId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch payment request');
  }

  return response.json();
}

/**
 * Create new payment request
 */
export async function createPaymentRequest(data: {
  userId: string;
  amountRub: number;
  amountUsdt: number;
  frozenRate: number;
  urgency: string;
  attachments?: Array<{type: 'image' | 'link' | 'pdf' | 'doc' | 'docx'; value: string; name?: string}>;
  comment?: string;
}): Promise<PaymentRequest> {
  const response = await fetch(`${API_BASE}/payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment request');
  }

  return response.json();
}

/**
 * Update payment request status
 */
export async function updatePaymentRequestStatus(requestId: string, status: string): Promise<{ success: boolean; status: string }> {
  const response = await fetch(`${API_BASE}/payments/${requestId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update payment request');
  }

  return response.json();
}

/**
 * Get notifications for user
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const response = await fetch(`${API_BASE}/notifications/user/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }

  return response.json();
}

/**
 * Get unread notifications count
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const response = await fetch(`${API_BASE}/notifications/user/${userId}/unread-count`);

  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }

  const data = await response.json();
  return data.count;
}

/**
 * Get current exchange rate
 */
export async function getExchangeRate(): Promise<ExchangeRate> {
  const response = await fetch(`${API_BASE}/exchange-rate`);

  if (!response.ok) {
    throw new Error('Failed to fetch exchange rate');
  }

  return response.json();
}

// Admin API Methods

export interface AdminUser {
  id: string;
  telegramId: string;
  username: string;
  availableBalance: number;
  frozenBalance: number;
  registeredAt: string;
}

export interface AdminPaymentRequest {
  id: string;
  userId: string;
  username: string;
  amountRub: number;
  amountUsdt: number;
  frozenRate: number;
  urgency: string;
  status: string;
  createdAt: string;
}

/**
 * Admin login
 */
export async function adminLogin(password: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

/**
 * Get all users (admin)
 */
export async function adminGetAllUsers(password: string): Promise<AdminUser[]> {
  const response = await fetch(`${API_BASE}/admin/users?password=${encodeURIComponent(password)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

/**
 * Get all payment requests (admin)
 */
export async function adminGetAllPayments(
  password: string,
  filters?: { status?: string; userId?: string; urgency?: string }
): Promise<AdminPaymentRequest[]> {
  const params = new URLSearchParams({ password });
  if (filters?.status) params.append('status', filters.status);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.urgency) params.append('urgency', filters.urgency);

  const response = await fetch(`${API_BASE}/admin/payments?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch payment requests');
  }

  return response.json();
}

/**
 * Update user balance (admin)
 */
export async function adminUpdateUserBalance(
  password: string,
  userId: string,
  availableBalance: number,
  frozenBalance: number
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/admin/user/${userId}/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, availableBalance, frozenBalance }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update balance');
  }

  return response.json();
}

/**
 * Add deposit to user (admin)
 */
export async function adminAddDeposit(
  password: string,
  userId: string,
  amount: number
): Promise<{ success: boolean; message: string; newBalance: number }> {
  const response = await fetch(`${API_BASE}/admin/user/${userId}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, amount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add deposit');
  }

  return response.json();
}

/**
 * Approve payment request (admin)
 */
export async function adminApprovePayment(
  password: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/admin/payment/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve payment');
  }

  return response.json();
}

/**
 * Cancel payment request (admin)
 */
export async function adminCancelPayment(
  password: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/admin/payment/${requestId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel payment');
  }

  return response.json();
}

/**
 * Create deposit request
 */
export async function createDeposit(
  userId: string,
  amount: number,
  txHash?: string
): Promise<Deposit> {
  const response = await fetch(`${API_BASE}/deposits/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, txHash }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create deposit');
  }

  return response.json();
}

/**
 * Create automated deposit with unique payable amount
 */
export interface AutomatedDepositResponse {
  id: string;
  walletAddress: string;
  requestedAmount: number;
  payableAmount: number;
  expiresAt: string;
  status: string;
  createdAt: string;
}

export async function createAutomatedDeposit(
  userId: string,
  requestedAmount: number
): Promise<AutomatedDepositResponse> {
  const response = await fetch(`${API_BASE}/deposits/create-automated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, requestedAmount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create automated deposit');
  }

  return response.json();
}

/**
 * Get user's deposit history
 */
export async function getUserDeposits(userId: string): Promise<Deposit[]> {
  const response = await fetch(`${API_BASE}/deposits/user/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch deposits');
  }

  return response.json();
}

/**
 * Get pending deposits (admin)
 */
export async function adminGetPendingDeposits(password: string): Promise<AdminDeposit[]> {
  const response = await fetch(`${API_BASE}/admin/deposits/pending?password=${encodeURIComponent(password)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch pending deposits');
  }

  return response.json();
}

/**
 * Confirm deposit (admin)
 */
export async function adminConfirmDeposit(
  password: string,
  depositId: string
): Promise<{ success: boolean; message: string; newBalance: number }> {
  const response = await fetch(`${API_BASE}/admin/deposits/${depositId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to confirm deposit');
  }

  return response.json();
}

/**
 * Reject deposit (admin)
 */
export async function adminRejectDeposit(
  password: string,
  depositId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/admin/deposits/${depositId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject deposit');
  }

  return response.json();
}

/**
 * Process payment request with optional receipt (admin)
 */
export async function adminProcessPaymentRequest(
  password: string,
  requestId: string,
  status: 'paid' | 'rejected',
  receipt?: {type: 'pdf' | 'image'; value: string; name: string; mimeType: string},
  adminComment?: string,
  newAmountRub?: number
): Promise<{ success: boolean; message: string; paymentRequest: PaymentRequest & { username?: string } }> {
  const response = await fetch(`${API_BASE}/admin/payments/${requestId}/process`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, status, receipt, adminComment, newAmountRub }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to process payment');
  }

  return response.json();
}

/**
 * Get payment request with full details (admin)
 */
export async function adminGetPaymentRequest(
  password: string,
  requestId: string
): Promise<PaymentRequest & { username?: string }> {
  const response = await fetch(`${API_BASE}/admin/payments/${requestId}?password=${encodeURIComponent(password)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch payment request');
  }

  return response.json();
}

export interface Operator {
  id: string;
  login: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Get all operators (admin)
 */
export async function adminGetAllOperators(password: string): Promise<Operator[]> {
  const response = await fetch(`${API_BASE}/admin/operators?password=${encodeURIComponent(password)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch operators');
  }

  return response.json();
}

/**
 * Create new operator (admin)
 */
export async function adminCreateOperator(
  password: string,
  login: string,
  operatorPassword: string
): Promise<Operator> {
  const response = await fetch(`${API_BASE}/admin/operators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, login, operatorPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create operator');
  }

  return response.json();
}

/**
 * Update operator status (admin)
 */
export async function adminUpdateOperatorStatus(
  password: string,
  operatorId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/admin/operators/${operatorId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, isActive }),
  });

  if (!response.ok) {
    throw new Error('Failed to update operator status');
  }

  return response.json();
}

/**
 * Delete operator (admin)
 */
export async function adminDeleteOperator(
  password: string,
  operatorId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/admin/operators/${operatorId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete operator');
  }

  return response.json();
}
