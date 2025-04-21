// app/(dashboard)/credits/_components/CreditBalance.tsx

import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

interface CreditBalanceProps {
  currentCredits: number;
}

export default function CreditBalance({ currentCredits }: CreditBalanceProps) {
  // Determinar status baseado na quantidade
  const getStatusInfo = () => {
    if (currentCredits <= 0) {
      return {
        text: "Créditos esgotados",
        color: "text-red-600",
        bg: "bg-red-50",
        description: "Compre créditos para continuar usando o serviço",
      };
    } else if (currentCredits < 100) {
      return {
        text: "Créditos baixos",
        color: "text-amber-600",
        bg: "bg-amber-50",
        description: "Seu saldo está baixo, considere comprar mais créditos",
      };
    } else {
      return {
        text: "Saldo saudável",
        color: "text-green-600",
        bg: "bg-green-50",
        description:
          "Você tem créditos suficientes para continuar usando o serviço",
      };
    }
  };

  const status = getStatusInfo();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{currentCredits} créditos</h2>
            <div className="flex items-center mt-1">
              <span className={`text-sm ${status.color}`}>{status.text}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{status.description}</p>
          </div>
          <div className={`p-4 rounded-full ${status.bg}`}>
            <CreditCard className={`h-8 w-8 ${status.color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
