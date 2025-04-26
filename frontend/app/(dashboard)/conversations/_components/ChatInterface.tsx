// app/(dashboard)/conversations/_components/ChatInterface.tsx

"use client";

import { useRef, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smartphone } from "lucide-react";
import api from "@/app/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: string;
  content: string;
  sender: string;
  type: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  status: string;
  userId: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

interface ChatInterfaceProps {
  conversation: Conversation;
  onSendMessage: (content: string) => Promise<boolean>;
}

export default function ChatInterface({
  conversation,
  onSendMessage,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isWhatsApp = conversation.channel === "WHATSAPP";

  // Ordenar mensagens por timestamp
  const sortedMessages = [...conversation.messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Rolar para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || sending) return;

    const messageToSend = message;
    setMessage("");
    setSending(true);

    try {
      // Primeiro, adicionar a mensagem do usuário
      const userMessageResponse = await api.post(
        `api/conversations/${conversation.id}/messages`,
        {
          content: messageToSend,
          type: "TEXT",
          sender: "ASSISTANT",
        }
      );

      // Se for uma conversa de WhatsApp, também enviar via WhatsApp
      if (isWhatsApp && conversation.userId) {
        try {
          await api.post("api/whatsapp/send", {
            to: conversation.userId,
            message: messageToSend,
            conversationId: conversation.id,
          });
        } catch (whatsappError) {
          console.error("Erro ao enviar mensagem WhatsApp:", whatsappError);
          toast.error(
            "Erro ao enviar mensagem pelo WhatsApp. Verifique a conexão do WhatsApp."
          );
        }
      }

      // Atualizar a conversa para mostrar todas as mensagens
      await onSendMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
      setMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 border-b bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">
              {conversation.userId || "Usuário Anônimo"}
            </h3>
            <div className="flex items-center space-x-2">
              {isWhatsApp ? (
                <Badge className="flex items-center space-x-1 bg-green-100 text-green-800 hover:bg-green-200">
                  <Smartphone className="h-3 w-3" />
                  <span>WhatsApp</span>
                </Badge>
              ) : (
                <p className="text-sm text-gray-500">
                  Canal: {conversation.channel}
                </p>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            ID: {conversation.id.substring(0, 8)}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        {sortedMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-400">
            <p>Nenhuma mensagem ainda. Comece a conversa!</p>
          </div>
        ) : (
          sortedMessages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${
                message.sender === "ASSISTANT" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender === "ASSISTANT"
                    ? "bg-blue-600 text-white"
                    : "bg-white border"
                }`}
              >
                <p className="break-words">{message.content}</p>
                <div
                  className={`text-xs mt-1 ${
                    message.sender === "ASSISTANT"
                      ? "text-blue-100"
                      : "text-gray-500"
                  }`}
                >
                  {formatDistanceToNow(new Date(message.timestamp), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {conversation.status === "ACTIVE" ? (
        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isWhatsApp
                  ? "Digite sua mensagem para enviar via WhatsApp..."
                  : "Digite sua mensagem..."
              }
              disabled={sending || conversation.status !== "ACTIVE"}
              className="flex-grow"
            />
            <Button
              type="submit"
              disabled={
                sending || !message.trim() || conversation.status !== "ACTIVE"
              }
            >
              {sending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          {isWhatsApp && (
            <div className="mt-2 text-xs text-gray-500 flex items-center">
              <Smartphone className="h-3 w-3 mr-1" />
              <span>
                Esta mensagem será enviada pelo WhatsApp para{" "}
                {conversation.userId}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border-t bg-gray-100 text-center text-gray-500">
          Esta conversa foi encerrada
        </div>
      )}
    </div>
  );
}
