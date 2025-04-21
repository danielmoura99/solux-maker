/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(dashboard)/dashboard/_components/CreditUsage.tsx

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
} from "recharts";

type CreditUsageProps = {
  credits: number;
};

// Dados simulados para o gráfico
const generateMockData = () => {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return days.map((day) => ({
    day,
    usage: Math.floor(Math.random() * 50) + 5,
  }));
};

export default function CreditUsage({ credits }: CreditUsageProps) {
  const router = useRouter();
  const [data, setData] = useState(generateMockData());

  // Em uma implementação real, buscaríamos os dados de uso de créditos da API

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-500">Saldo Atual</p>
          <p className="text-2xl font-bold">{credits} créditos</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/credits")}>
          Comprar Créditos
        </Button>
      </div>

      <p className="text-sm font-medium">Uso de Créditos (Últimos 7 dias)</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="usage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
