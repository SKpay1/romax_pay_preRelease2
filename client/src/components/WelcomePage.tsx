import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";

interface WelcomePageProps {
  onStart: () => void;
}

export default function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background gradient-header">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <Card className="p-10 shadow-card gradient-card rounded-lg">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center shadow-md">
              <Wallet className="w-14 h-14 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground">Привет!</h1>
              <p className="text-base text-muted-foreground leading-relaxed font-medium">
                Плати в рублях, пополняя баланс в USDT (TRC20). Быстро, удобно, современно.
              </p>
            </div>

            <Button 
              onClick={onStart}
              className="w-full min-h-[52px] text-base font-bold rounded-lg gradient-primary shadow-premium text-white"
              data-testid="button-open-wallet"
            >
              Открыть кошелёк
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
