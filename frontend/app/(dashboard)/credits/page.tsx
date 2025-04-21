// app/(dashboard)/credits/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CreditCard, History } from "lucide-react";
import CreditBalance from "./_components/CreditBalance";
import CreditHistory from "./_components/CreditHistory";
import CreditPackages from "./_components/CreditPackages";

export default function CreditsPage() {
  const { user } = useAuth();
  const [currentCredits, setCurrentCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCreditBalance = async () => {
    try {
      if (!user?.companyId) return;

      const companyResponse = await api.get(`api/companies/${user.companyId}`);
      setCurrentCredits(companyResponse.data.credits);
    } catch (error) {
      console.error("Erro ao buscar saldo de créditos:", error);
      toast.error("Não foi possível carregar o saldo de créditos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditBalance();
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gerenciamento de Créditos</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <CreditBalance currentCredits={currentCredits} />

          <Tabs defaultValue="packages" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="packages">Comprar Créditos</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="packages" className="mt-4">
              <CreditPackages onSuccess={fetchCreditBalance} />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <CreditHistory />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
