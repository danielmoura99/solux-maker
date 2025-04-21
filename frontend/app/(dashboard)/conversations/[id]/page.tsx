// app/(dashboard)/conversations/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, XCircle } from "lucide-react";
import ChatInterface from "../_components/ChatInterface";

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

export default function ConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`api/conversations/${id}`);
      setConversation(response.data);
    } catch (error) {
      console.error("Erro ao carregar conversa:", error);
      toast.error("Erro ao carregar conversa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId && id) {
      fetchConversation();
    }
  }, [user, id]);

  const handleSendMessage = async (content: string) => {
    try {
      await api.post(`api/conversations/${id}/messages`, {
        content,
        type: "TEXT",
        sender: "ASSISTANT",
      });

      // Atualizar a conversa após enviar mensagem
      fetchConversation();

      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
      return false;
    }
  };

  const handleCloseConversation = async () => {
    try {
      await api.put(`api/conversations/${id}/close`);
      toast.success("Conversa encerrada com sucesso");
      fetchConversation();
    } catch (error) {
      console.error("Erro ao encerrar conversa:", error);
      toast.error("Erro ao encerrar conversa");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-10">
        <h3 className="mt-2 text-sm font-semibold text-gray-900">
          Conversa não encontrada
        </h3>
        <div className="mt-6">
          <Button onClick={() => router.push("/conversations")}>
            Voltar para Conversas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => router.push("/conversations")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center">
          <span
            className={`px-2 py-1 text-xs rounded-full mr-4 ${
              conversation.status === "ACTIVE"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {conversation.status === "ACTIVE" ? "Ativa" : "Encerrada"}
          </span>

          {conversation.status === "ACTIVE" && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCloseConversation}
            >
              <XCircle className="mr-2 h-4 w-4" /> Encerrar Conversa
            </Button>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-hidden shadow-sm rounded-lg border">
        <ChatInterface
          conversation={conversation}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
