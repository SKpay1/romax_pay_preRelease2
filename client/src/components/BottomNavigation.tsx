import { Home, Receipt, BookOpen, Settings } from "lucide-react";

interface BottomNavigationProps {
  activeTab: 'home' | 'history' | 'instructions' | 'settings';
  onTabChange: (tab: 'home' | 'history' | 'instructions' | 'settings') => void;
  unreadCount?: number;
}

export default function BottomNavigation({ activeTab, onTabChange, unreadCount = 0 }: BottomNavigationProps) {
  const tabs = [
    { id: 'home' as const, label: 'Главная', icon: Home },
    { id: 'history' as const, label: 'История', icon: Receipt },
    { id: 'instructions' as const, label: 'Инструкция', icon: BookOpen },
    { id: 'settings' as const, label: 'Настройки', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-3 sm:bottom-6 left-2 sm:left-6 right-2 sm:right-6 z-50">
      <div className="max-w-md mx-auto bg-card border-t-2 border-border shadow-soft rounded-lg">
        <div className="flex items-center justify-around min-h-[72px] sm:min-h-[80px] px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 flex-1 transition-soft ${
                  isActive ? '' : ''
                }`}
                data-testid={`button-nav-${tab.id}`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent rounded-b-full" />
                )}
                <Icon 
                  className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${
                    isActive ? 'text-secondary stroke-[2]' : 'text-muted-foreground stroke-[2]'
                  }`} 
                />
                <span 
                  className={`text-[9px] sm:text-[10px] font-semibold leading-tight text-center ${
                    isActive ? 'text-secondary' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
