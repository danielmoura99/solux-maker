// app/(dashboard)/conversations/_components/WhatsAppBadge.tsx

import { Smartphone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WhatsAppBadgeProps {
  userId?: string;
}

export default function WhatsAppBadge({ userId }: WhatsAppBadgeProps) {
  // Formatar o número de telefone para exibição
  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return "";

    // Se for um número internacional completo (exemplo: 5511999999999)
    if (phoneNumber.length >= 10) {
      // Tenta formatar números brasileiros
      if (phoneNumber.startsWith("55") && phoneNumber.length >= 12) {
        const ddd = phoneNumber.substring(2, 4);
        const firstPart = phoneNumber.substring(4, phoneNumber.length - 4);
        const lastPart = phoneNumber.substring(phoneNumber.length - 4);
        return `+55 (${ddd}) ${firstPart}-${lastPart}`;
      }

      // Formato genérico para outros casos
      return `+${phoneNumber.substring(0, 2)} ${phoneNumber.substring(2)}`;
    }

    return phoneNumber;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <Smartphone className="h-3 w-3 mr-1" />
            <span>WhatsApp</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {userId
              ? `Número: ${formatPhoneNumber(userId)}`
              : "Conversa via WhatsApp"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
