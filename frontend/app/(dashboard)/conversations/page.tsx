// app/(dashboard)/conversations/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, RefreshCw, Plus } from "lucide-react";
import ConversationList from "./_components/ConversationList";

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

export default function ConversationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
  });

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get("api/conversations");
      setConversations(response.data.conversations || []);

      // Calcular estatísticas
      const total = response.data.pagination.total || 0;
      const active = (response.data.conversations || []).filter(
        (c: Conversation) => c.status === "ACTIVE"
      ).length;

      setStats({
        total,
        active,
        closed: total - active,
      });
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchConversations();
    }
  }, [user]);

  const handleRefresh = () => {
    fetchConversations();
  };

  const handleNewConversation = () => {
    router.push("/conversations/new");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Conversas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          <Button onClick={handleNewConversation}>
            <Plus className="mr-2 h-4 w-4" /> Nova Conversa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total de Conversas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Conversas Ativas</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Conversas Encerradas</p>
                <p className="text-2xl font-bold">{stats.closed}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50">
                <MessageCircle className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ConversationList
          conversations={conversations}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
