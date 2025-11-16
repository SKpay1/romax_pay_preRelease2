import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function SupportPage() {
  const handleContactSupport = () => {
    console.log('Opening Telegram support...');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-4 pt-6 pb-24 bg-background">
      <div className="max-w-md w-full mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Поддержка</h1>

        <Card className="p-8 text-center space-y-6 shadow-lg rounded-2xl">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Нужна помощь?</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Есть вопросы или что-то не получается? Наша поддержка с радостью поможет. Обычно отвечаем в течение 5–20 минут.
            </p>
          </div>

          <Button 
            onClick={handleContactSupport}
            className="w-full gap-2 rounded-xl"
            size="lg"
            data-testid="button-contact-support"
          >
            <MessageCircle className="w-5 h-5" />
            Написать в Telegram
          </Button>
        </Card>
      </div>
    </div>
  );
}
