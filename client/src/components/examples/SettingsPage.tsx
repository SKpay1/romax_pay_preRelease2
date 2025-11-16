import SettingsPage from '../SettingsPage';

export default function SettingsPageExample() {
  return (
    <SettingsPage 
      username="crypto_user"
      registeredAt={new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}
      onClearData={() => console.log('Clear data clicked')}
    />
  );
}
