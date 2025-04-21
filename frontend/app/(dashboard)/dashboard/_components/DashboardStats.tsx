// app/(dashboard)/dashboard/_components/DashboardStats.tsx

import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, FileText, CreditCard, Activity } from "lucide-react";

type DashboardStatsProps = {
  stats: {
    totalConversations: number;
    activeConversations: number;
    totalDocuments: number;
    credits: number;
  };
};

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      title: "Total de Conversas",
      value: stats.totalConversations,
      icon: <MessageCircle className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-50",
    },
    {
      title: "Conversas Ativas",
      value: stats.activeConversations,
      icon: <Activity className="h-5 w-5 text-green-500" />,
      color: "bg-green-50",
    },
    {
      title: "Documentos",
      value: stats.totalDocuments,
      icon: <FileText className="h-5 w-5 text-purple-500" />,
      color: "bg-purple-50",
    },
    {
      title: "Créditos Restantes",
      value: stats.credits,
      icon: <CreditCard className="h-5 w-5 text-amber-500" />,
      color: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${item.color}`}>{item.icon}</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {item.title}
                </p>
                <p className="text-2xl font-bold">{item.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
