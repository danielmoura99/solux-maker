// frontend/app/(dashboard)/conversations/[id]/_components/WhatsAppDetails.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Smartphone, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/app/lib/api";

interface WhatsAppDetailsProps {
  conversationId: string;
  userId: string; // O número do WhatsApp
  onMessageSent?: () => void;
}

export default function WhatsAppDetails({
  conversationId,
  userId,
  onMessageSent,
}: WhatsAppDetailsProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Formatar o número do WhatsApp para exibição
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

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);

      // Enviar mensagem diretamente pelo WhatsApp
      await api.post("api/whatsapp/send", {
        to: userId,
        message: message.trim(),
        conversationId,
      });

      // Limpar campo de mensagem
      setMessage("");
      toast.success("Mensagem enviada com sucesso");

      // Recarregar conversa, se solicitado
      if (onMessageSent) {
        onMessageSent();
      }

      // Esconder formulário
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao enviar mensagem WhatsApp:", error);
      toast.error("Erro ao enviar mensagem pelo WhatsApp");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mt-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-green-600" />
          <h3 className="font-medium">Detalhes do WhatsApp</h3>
        </div>
        <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
          Conectado
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-sm text-gray-500">Número:</span>
          <span className="ml-2 font-medium">{formatPhoneNumber(userId)}</span>
        </div>
      </div>

      {showForm ? (
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite uma mensagem para enviar via WhatsApp..."
            className="min-h-24"
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Enviar Mensagem via WhatsApp
        </Button>
      )}

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-start">
          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2" />
          <div className="text-xs text-gray-500">
            Mensagens enviadas e recebidas serão sincronizadas automaticamente
            com esta conversa. Você pode alternar entre responder diretamente ou
            através do assistente.
          </div>
        </div>
      </div>
    </div>
  );
}
