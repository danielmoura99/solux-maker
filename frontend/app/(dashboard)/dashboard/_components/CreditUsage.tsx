// frontend/app/(dashboard)/dashboard/_components/CreditUsage.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CreditUsageProps = {
  credits: number;
};

type UsageData = {
  day: string;
  usage: number;
};

type ModelUsageData = {
  model: string;
  usage: number;
  color: string;
};

// Cores para o gráfico de pizza
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function CreditUsage({ credits }: CreditUsageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [dailyUsage, setDailyUsage] = useState<UsageData[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  // Em uma implementação real, buscaríamos os dados da API
  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setLoading(true);

        // Simular dados para o MVP - Futuramente, isso virá da API
        const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
        const mockDailyData = days.map((day) => ({
          day,
          usage: Math.floor(Math.random() * 50) + 5,
        }));

        const mockModelData = [
          { model: "GPT-3.5", usage: 120, color: COLORS[0] },
          { model: "GPT-4", usage: 45, color: COLORS[1] },
          { model: "Claude", usage: 75, color: COLORS[2] },
          { model: "Gemini", usage: 30, color: COLORS[3] },
        ];

        setDailyUsage(mockDailyData);
        setModelUsage(mockModelData);

        // Futuramente, buscaremos dados reais da API:
        // const response = await api.get('api/credits/usage');
        // setDailyUsage(response.data.dailyUsage);
        // setModelUsage(response.data.modelUsage);
      } catch (error) {
        console.error("Erro ao buscar dados de uso:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [user?.companyId]);

  // Determinar alertas baseados no saldo
  const showLowBalanceAlert = credits < 50;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Saldo Atual</p>
          <p className="text-2xl font-bold">{credits} créditos</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/credits")}>
          Comprar Créditos
        </Button>
      </div>

      {showLowBalanceAlert && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Saldo Baixo</AlertTitle>
          <AlertDescription className="text-amber-700">
            Seu saldo de créditos está baixo. Considere comprar mais créditos
            para evitar interrupções no serviço.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium mb-2">
            Uso de Créditos (Últimos 7 dias)
          </p>
          <div className="h-60 bg-white p-4 rounded-lg border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyUsage}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} créditos`, "Uso"]} />
                <Bar dataKey="usage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Uso por Modelo</p>
          <div className="h-60 bg-white p-4 rounded-lg border">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelUsage}
                  dataKey="usage"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => entry.model}
                >
                  {modelUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} créditos`, "Uso"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="pt-4 text-center">
        <Button
          variant="outline"
          onClick={() => router.push("/credits/history")}
        >
          Ver Histórico Completo
        </Button>
      </div>
    </div>
  );
}
