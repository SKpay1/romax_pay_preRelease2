import DashboardPage from '../DashboardPage';

export default function DashboardPageExample() {
  return (
    <DashboardPage 
      usdtBalance={120.50}
      onTopUp={() => console.log('Top up clicked')}
      onPay={() => console.log('Pay clicked')}
    />
  );
}
