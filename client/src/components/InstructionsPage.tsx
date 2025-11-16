import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";

export default function InstructionsPage() {
  const handleContactSupport = () => {
    console.log('Opening Telegram support...');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-4 sm:px-6 pt-6 pb-32 bg-background">
      <div className="max-w-md w-full mx-auto space-y-5">
        <h1 className="text-3xl font-bold text-foreground mb-2">Инструкция</h1>

        {/* What Can Be Paid Block */}
        <Card className="p-4 bg-green-50 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center shrink-0 rounded-lg">
              <CheckCircle className="w-7 h-7 text-green-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-foreground leading-tight">Что можно оплачивать</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold text-foreground shrink-0">•</span>
              <p className="text-sm font-medium text-foreground leading-snug">Рестораны и кафе (QR-коды на столах, ссылки на электронные счета).</p>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold text-foreground shrink-0">•</span>
              <p className="text-sm font-medium text-foreground leading-snug">Интернет-магазины, если есть счет или QR-код.</p>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold text-foreground shrink-0">•</span>
              <p className="text-sm font-medium text-foreground leading-snug">Любые услуги, где можно оплатить в течение хотя бы 5–7 минут.</p>
            </div>
          </div>
        </Card>

        {/* What Cannot Be Paid Block */}
        <Card className="p-4 bg-red-50 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 flex items-center justify-center shrink-0 rounded-lg">
              <XCircle className="w-7 h-7 text-red-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-foreground leading-tight">Что нельзя оплачивать</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold text-foreground shrink-0">•</span>
              <p className="text-sm font-medium text-foreground leading-snug">Ситуации, где оплата требуется за 1–2 минуты (например, на кассе в магазине).</p>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold text-foreground shrink-0">•</span>
              <p className="text-sm font-medium text-foreground leading-snug">Оплата, где QR-код действует слишком мало времени.</p>
            </div>
          </div>
        </Card>

        {/* Exchange Rate Calculation Block */}
        <Card className="p-4 bg-cyan-50 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-cyan-100 flex items-center justify-center shrink-0 rounded-lg">
              <TrendingUp className="w-7 h-7 text-cyan-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-foreground leading-tight">Как мы считаем курс</h2>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground leading-snug">
              Мы отображаем официальный курс ЦБ РФ, полученный через Google.
            </p>
            <p className="text-sm font-medium text-foreground leading-snug">
              Курс является ориентировочным и обновляется автоматически.
            </p>
          </div>
        </Card>

        {/* Support Block - Moved to Bottom */}
        <Card className="p-4 bg-blue-50 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center shrink-0 rounded-lg">
              <MessageCircle className="w-7 h-7 text-blue-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-foreground leading-tight">Если есть вопросы</h2>
          </div>
          
          <p className="text-sm font-medium text-foreground mb-4 leading-snug">
            Если у вас возникли вопросы — не стесняйтесь писать нам в Telegram.<br />
            Мы всегда поможем.
          </p>
          
          <Button 
            onClick={handleContactSupport}
            className="w-full gap-2 h-12 text-base font-semibold"
            data-testid="button-contact-support"
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2} />
            Написать в Telegram
          </Button>
        </Card>
      </div>
    </div>
  );
}
