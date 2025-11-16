import HistoryPage from '../HistoryPage';

export default function HistoryPageExample() {
  const mockTransactions = [
    {
      id: '1',
      amountRub: 5000,
      amountUsdt: 55.56,
      urgency: 'urgent' as const,
      status: 'paid' as const,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      amountRub: 12000,
      amountUsdt: 133.33,
      urgency: 'standard' as const,
      status: 'processing' as const,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      amountRub: 3500,
      amountUsdt: 38.89,
      urgency: 'urgent' as const,
      status: 'submitted' as const,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      amountRub: 8000,
      amountUsdt: 88.89,
      urgency: 'standard' as const,
      status: 'rejected' as const,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return <HistoryPage transactions={mockTransactions} onGoHome={() => console.log('Go home')} />;
}
