// app/(dashboard)/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import DashboardStats from "./_components/DashboardStats";
import RecentConversations from "./_components/RecentConversations";
import CreditUsage from "./_components/CreditUsage";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeConversations: 0,
    totalDocuments: 0,
    credits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Em uma implementação real, você teria um endpoint para obter estatísticas do dashboard
        // Por ora, vamos simular alguns dados

        // Obter dados da empresa
        const companyResponse = await api.get(
          `api/companies/${user?.companyId}`
        );

        // Obter contagem de conversas
        const conversationsResponse = await api.get("api/conversations", {
          params: { limit: 1, offset: 0 },
        });

        // Obter contagem de documentos
        const documentsResponse = await api.get("api/documents");

        setStats({
          totalConversations: conversationsResponse.data.pagination.total || 0,
          activeConversations: (conversationsResponse.data.conversations || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((c: any) => c.status === "ACTIVE").length,
          totalDocuments: documentsResponse.data.length || 0,
          credits: companyResponse.data.credits,
        });
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Estatísticas */}
      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversas recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Conversas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentConversations />
          </CardContent>
        </Card>

        {/* Uso de créditos */}
        <Card>
          <CardHeader>
            <CardTitle>Uso de Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <CreditUsage credits={stats.credits} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
