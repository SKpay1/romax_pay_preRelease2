import PayPage from '../PayPage';

export default function PayPageExample() {
  return (
    <PayPage 
      exchangeRate={90}
      availableRub={10800}
      onBack={() => console.log('Back clicked')}
      onSubmit={(data) => console.log('Payment submitted:', data)}
    />
  );
}
