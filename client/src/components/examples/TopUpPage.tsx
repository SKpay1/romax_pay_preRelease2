import TopUpPage from '../TopUpPage';

export default function TopUpPageExample() {
  return (
    <TopUpPage 
      walletAddress="TX1111111111111111111111"
      onBack={() => console.log('Back clicked')}
      onTopUpComplete={(amount) => console.log(`Top up complete: ${amount} USDT`)}
    />
  );
}
