// app/(dashboard)/dashboard/_components/RecentConversations.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Conversation = {
  id: string;
  status: string;
  userId: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  _count: {
    messages: number;
  };
};

type Message = {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
};

export default function RecentConversations() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get("api/conversations", {
          params: { limit: 5, offset: 0 },
        });
        setConversations(response.data.conversations || []);
      } catch (error) {
        console.error("Erro ao carregar conversas recentes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchConversations();
    }
  }, [user]);

  const handleViewConversation = (id: string) => {
    router.push(`/conversations/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma conversa encontrada</p>
        <Button
          className="mt-4"
          onClick={() => router.push("/conversations/new")}
        >
          Iniciar Nova Conversa
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => handleViewConversation(conversation.id)}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">
                {conversation.userId || "Usuário Anônimo"}
              </p>
              <p className="text-sm text-gray-500">
                {conversation.messages[0]?.content?.substring(0, 50) ||
                  "Sem mensagens"}
                {conversation.messages[0]?.content?.length > 50 ? "..." : ""}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  conversation.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {conversation.status === "ACTIVE" ? "Ativa" : "Encerrada"}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(conversation.updatedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {conversation._count.messages} mensagens
            </span>
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
              {conversation.channel}
            </span>
          </div>
        </div>
      ))}
      <div className="pt-2 text-center">
        <Button variant="outline" onClick={() => router.push("/conversations")}>
          Ver Todas as Conversas
        </Button>
      </div>
    </div>
  );
}
