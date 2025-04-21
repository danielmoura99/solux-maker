// app/(dashboard)/conversations/_components/ConversationList.tsx

"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, User, Calendar, Hash } from "lucide-react";

type Message = {
  id: string;
  content: string;
  sender: string;
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
  _count: {
    messages: number;
  };
};

type ConversationListProps = {
  conversations: Conversation[];
  onRefresh: () => void;
};

export default function ConversationList({
  conversations,
  onRefresh,
}: ConversationListProps) {
  const router = useRouter();

  if (conversations.length === 0) {
    return (
      <div className="text-center py-10">
        <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">
          Nenhuma conversa encontrada
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Comece uma nova conversa para iniciar um atendimento.
        </p>
        <div className="mt-6">
          <Button onClick={() => router.push("/conversations/new")}>
            Nova Conversa
          </Button>
        </div>
      </div>
    );
  }

  const handleClick = (id: string) => {
    router.push(`/conversations/${id}`);
  };

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => handleClick(conversation.id)}
        >
          <div className="flex justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {conversation.userId || "Usuário anônimo"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(conversation.updatedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
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
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <MessageCircle className="h-3 w-3 mr-1" />
                <span>{conversation._count.messages} mensagens</span>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm text-gray-700 line-clamp-2">
              {conversation.messages[0]?.content || "Sem mensagens"}
            </p>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <div className="flex items-center text-xs text-gray-500">
              <Hash className="h-3 w-3 mr-1" />
              <span>{conversation.id.substring(0, 8)}</span>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
              {conversation.channel}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
