import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface DashboardPageProps {
  availableUsdt: number;
  frozenUsdt: number;
  exchangeRate: number;
  onTopUp: () => void;
  onPay: () => void;
  hasDraft?: boolean;
  username?: string;
}

export default function DashboardPage({ 
  availableUsdt, 
  frozenUsdt, 
  exchangeRate, 
  onTopUp, 
  onPay, 
  hasDraft,
  username = 'Пользователь'
}: DashboardPageProps) {
  const equivalentRub = availableUsdt * exchangeRate;

  return (
    <div className="flex flex-col min-h-[90vh] px-4 sm:px-5 pt-4 sm:pt-5 pb-6 bg-background">
      <div className="max-w-md w-full mx-auto space-y-4 sm:space-y-5 flex-1 flex flex-col">
        
        {/* Header: Avatar + Username + BETA badge */}
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          {/* Avatar + Username */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/20 border-4 border-teal-800 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-teal-800" />
            </div>
            <div className="flex flex-col">
              <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                {username}
              </p>
            </div>
          </div>

          {/* BETA Badge */}
          <div className="px-4 sm:px-5 py-2 bg-primary/20 border-3 border-teal-800 rounded-lg flex-shrink-0">
            <p className="text-sm sm:text-base font-black text-teal-800">BETA</p>
          </div>
        </div>

        {/* Available Balance Card - Light green/cyan */}
        <Card className="p-6 sm:p-8 bg-teal-100 border-4 border-teal-600 shadow-brutal flex-shrink-0" data-testid="card-usdt-balance">
          <p className="text-base sm:text-lg font-bold text-center mb-2 text-foreground">
            Доступно USDT
          </p>
          <p className="text-5xl sm:text-6xl font-black text-center tabular-nums text-teal-800 mb-2" data-testid="text-usdt-amount">
            {availableUsdt.toFixed(2)}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-center text-primary">
            USDT
          </p>
        </Card>

        {/* Exchange Rate Bar - Dark teal */}
        <div className="p-4 sm:p-5 bg-secondary text-secondary-foreground rounded-xl border-4 border-border shadow-brutal flex-shrink-0 mt-5" data-testid="card-exchange-rate">
          <p className="text-xl sm:text-2xl font-bold text-center" data-testid="text-exchange-rate">
            📈 1 USDT = {exchangeRate.toFixed(2)} ₽
          </p>
        </div>

        {/* Frozen Balance Warning - Only if > 0 */}
        {frozenUsdt > 0 && (
          <div className="p-3 sm:p-4 bg-yellow-100 border-3 border-yellow-500 rounded-lg flex items-center justify-center gap-2 flex-shrink-0">
            <span className="text-lg">🔒</span>
            <p className="text-sm sm:text-base font-bold text-yellow-900">
              Заморожено: {frozenUsdt.toFixed(2)} USDT
            </p>
          </div>
        )}

        {/* Ruble Equivalent Section - White card with spacious layout */}
        <Card className="flex-1 flex flex-col justify-center py-6 sm:py-8 min-h-[120px] bg-teal-100 border-4 border-teal-600 shadow-brutal -mt-[7.75rem]">
          <p className="text-base sm:text-lg font-bold text-center mb-2 text-foreground">
            Эквивалент в ₽
          </p>
          <p className="text-5xl sm:text-6xl font-black text-center tabular-nums text-secondary" data-testid="text-rub-amount">
            {equivalentRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
          </p>
        </Card>

        {/* Action Buttons - Side by side */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-shrink-0">
          {/* Top Up Button - Outline style (cyan/teal border) */}
          <Button 
            variant="outline"
            size="lg"
            className="h-42 sm:h-48 text-3xl sm:text-4xl font-bold border-4 border-yellow-600 text-yellow-900 bg-yellow-400 hover:bg-yellow-500 rounded-xl shadow-brutal transition-colors"
            onClick={onTopUp}
            data-testid="button-top-up"
          >
            Пополнить
          </Button>
          
          {/* Pay Button - Filled style (dark teal) */}
          <Button 
            variant="default"
            size="lg"
            className="relative h-42 sm:h-48 text-3xl sm:text-4xl font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 border-4 border-border rounded-xl shadow-brutal transition-colors overflow-visible"
            onClick={onPay}
            data-testid="button-pay"
          >
            {hasDraft ? 'Продолжить' : 'Оплатить'}
            {hasDraft && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full shadow-md border-2 border-background"></span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
