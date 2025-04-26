//frontend/app/(dashboard)/whatsapp/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Smartphone,
  QrCode,
  RefreshCw,
  XCircle,
  CheckCircle,
} from "lucide-react";
import WhatsAppSetup from "../settings/_components/WhatsAppSetup";

// Status possíveis da integração WhatsApp
type WhatsAppStatus =
  | "NOT_CONFIGURED"
  | "INITIALIZING"
  | "WAITING_QR_SCAN"
  | "CONNECTED"
  | "DISCONNECTED"
  | "AUTH_FAILED";

// Informações da conta WhatsApp conectada
type WhatsAppInfo = {
  number: string;
  connectedAt: string;
};

export default function WhatsAppDashboardPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>("NOT_CONFIGURED");
  const [info, setInfo] = useState<WhatsAppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayMessages: 0,
    totalMessages: 0,
    activeConversations: 0,
  });

  // Verificar status atual
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get("api/whatsapp/status");
      setStatus(response.data.status);
      setInfo(response.data.info);
    } catch (error) {
      console.error("Erro ao verificar status do WhatsApp:", error);
      toast.error("Erro ao verificar status do WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  // Buscar estatísticas
  const fetchStats = async () => {
    try {
      // Em uma implementação real, você faria uma chamada API
      // para buscar estatísticas reais de mensagens e conversas
      const response = await api.get("api/conversations", {
        params: {
          channel: "WHATSAPP",
          status: "ACTIVE",
        },
      });

      // Contar o número de conversas ativas
      const activeConversations = response.data.pagination?.total || 0;

      // Simular contagem de mensagens para o MVP
      setStats({
        todayMessages: Math.floor(Math.random() * 50),
        totalMessages: Math.floor(Math.random() * 500),
        activeConversations,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  // Inicializar ao carregar o componente
  useEffect(() => {
    if (user?.companyId) {
      fetchStatus();
      fetchStats();
    }
  }, [user]);

  // Renderiza os cartões de estatísticas
  const renderStats = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Mensagens Hoje</p>
                <p className="text-2xl font-bold">{stats.todayMessages}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <Smartphone className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total de Mensagens</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-50">
                <Smartphone className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Conversas Ativas</p>
                <p className="text-2xl font-bold">
                  {stats.activeConversations}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <Smartphone className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <Button
          variant="outline"
          onClick={() => {
            fetchStatus();
            fetchStats();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {status === "CONNECTED" && renderStats()}

      <Card>
        <CardHeader>
          <CardTitle>Status da Conexão</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <WhatsAppSetup />
        </CardContent>
      </Card>

      {status === "CONNECTED" && (
        <Card>
          <CardHeader>
            <CardTitle>Guia Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Seu assistente virtual agora está conectado ao WhatsApp. Quando
                seus clientes enviarem mensagens para o número{" "}
                {info?.number.split("@")[0]}, seu assistente responderá
                automaticamente com base na sua base de conhecimento.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Dicas:</h4>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  <li>
                    Mantenha seu computador/servidor ligado para que a conexão
                    permaneça ativa
                  </li>
                  <li>
                    Adicione documentos à sua base de conhecimento para melhorar
                    as respostas
                  </li>
                  <li>
                    Visite a seção de Conversas para ver todas as interações
                  </li>
                  <li>
                    Você pode intervir manualmente em qualquer conversa quando
                    necessário
                  </li>
                </ul>
              </div>

              <p className="text-sm text-gray-500">
                Este é um sistema de WhatsApp Web, similar a usar o WhatsApp no
                navegador. A sessão permanecerá ativa até que você desconecte ou
                haja algum problema na conexão.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
