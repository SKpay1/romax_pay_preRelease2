interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
