// frontend/app/(dashboard)/credits/_components/CreditHistory.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CreditTransaction = {
  id: string;
  companyId: string;
  amount: number;
  operationType: string;
  timestamp: string;
  balanceAfter: number;
  description: string;
  metadata?: {
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    model?: string;
    creditCost?: number;
    planId?: string;
    planName?: string;
    price?: number;
    validUntil?: string;
  };
};

export default function CreditHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.get("api/credits/history");
        setTransactions(response.data.transactions || []);
      } catch (error) {
        console.error("Erro ao buscar histórico de créditos:", error);
        toast.error("Erro ao buscar histórico de créditos");
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchTransactions();
    }
  }, [user]);

  // Função auxiliar para formatar data com verificação de segurança
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border">
        <p className="text-gray-500">Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Detalhes</TableHead>
            <TableHead className="text-right">Saldo Após</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(transaction.timestamp), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {transaction.operationType === "ADD" ? (
                    <div className="bg-green-100 text-green-800 p-1 rounded-full">
                      <ArrowUp className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="bg-red-100 text-red-800 p-1 rounded-full">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                  )}
                  <span className="ml-2">
                    {transaction.operationType === "ADD" ? "Adição" : "Consumo"}
                  </span>
                </div>
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  transaction.operationType === "ADD"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {transaction.operationType === "ADD" ? "+" : "-"}
                {transaction.amount}
              </TableCell>
              <TableCell className="text-right">
                {transaction.metadata?.tokenUsage && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-end cursor-help">
                          <span className="mr-1">
                            {transaction.metadata.tokenUsage.total} tokens
                          </span>
                          <Info className="h-4 w-4 text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modelo: {transaction.metadata.model || "Padrão"}</p>
                        <p>
                          Entrada: {transaction.metadata.tokenUsage.input}{" "}
                          tokens
                        </p>
                        <p>
                          Saída: {transaction.metadata.tokenUsage.output} tokens
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {transaction.metadata?.planName && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-end cursor-help">
                          <span className="mr-1">
                            Plano {transaction.metadata.planName}
                          </span>
                          <Info className="h-4 w-4 text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Válido até:{" "}
                          {formatDate(transaction.metadata.validUntil)}
                        </p>
                        <p>
                          Preço: R${" "}
                          {((transaction.metadata.price || 0) / 100).toFixed(2)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </TableCell>
              <TableCell className="text-right">
                {transaction.balanceAfter}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
