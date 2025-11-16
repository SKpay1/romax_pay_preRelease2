import BottomNavigation from '../BottomNavigation';
import { useState } from 'react';

export default function BottomNavigationExample() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'support' | 'settings'>('home');
  
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Active tab: <span className="font-semibold text-foreground">{activeTab}</span></p>
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
