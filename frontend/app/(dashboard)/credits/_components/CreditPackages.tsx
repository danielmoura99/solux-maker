// frontend/app/(dashboard)/credits/_components/CreditPackages.tsx

"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, CreditCard, Shield, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Tipos
type CreditPlan = {
  id: string;
  name: string;
  credits: number;
  price: number; // em centavos
  features: string[];
  recommended: boolean;
  validityDays: number;
};

interface CreditPackagesProps {
  onSuccess: () => void;
}

export default function CreditPackages({ onSuccess }: CreditPackagesProps) {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState<CreditPlan[]>([
    {
      id: "basic",
      name: "Básico",
      credits: 100,
      price: 5000, // R$ 50,00
      features: [
        "100 créditos para usar em consultas",
        "Suporte por email",
        "Acesso a modelos padrão",
        "Válido por 30 dias",
      ],
      recommended: false,
      validityDays: 30,
    },
    {
      id: "standard",
      name: "Padrão",
      credits: 300,
      price: 12000, // R$ 120,00
      features: [
        "300 créditos para usar em consultas",
        "Suporte por email e chat",
        "Acesso a todos os modelos",
        "20% de desconto no valor",
        "Válido por 60 dias",
      ],
      recommended: true,
      validityDays: 60,
    },
    {
      id: "premium",
      name: "Premium",
      credits: 1000,
      price: 30000, // R$ 300,00
      features: [
        "1000 créditos para usar em consultas",
        "Suporte prioritário",
        "Acesso a modelos premium",
        "40% de desconto no valor",
        "Válido por 90 dias",
      ],
      recommended: false,
      validityDays: 90,
    },
  ]);

  // Função para buscar planos da API (opcional neste estágio)
  const fetchPlans = async () => {
    try {
      const response = await api.get("api/credits/plans");
      if (response.data.plans) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
    }
  };

  // Simulação de compra com preparação para futura integração Stripe
  const handlePurchase = async () => {
    if (!selectedPackage) return;

    const pkg = plans.find((p) => p.id === selectedPackage);
    if (!pkg) return;

    try {
      setProcessing(true);

      // Futura integração com Stripe - preparando a estrutura
      // Nesta etapa, apenas simulamos a compra
      const response = await api.post(`api/credits/purchase`, {
        planId: pkg.id,
        paymentMethod: "credit_card", // Placeholder para futuro
      });

      toast.success(`Compra do pacote ${pkg.name} realizada com sucesso!`);
      toast.info(
        "Seus créditos foram adicionados e já estão disponíveis para uso."
      );

      setSelectedPackage(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao processar compra:", error);
      toast.error("Erro ao processar a compra. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Escolha um plano de créditos</h3>
        <p className="text-sm text-gray-500">
          Os créditos são consumidos conforme o uso do sistema e permitem que
          você acesse todas as funcionalidades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((pkg) => (
          <Card
            key={pkg.id}
            className={`
              transition-all duration-200
              ${pkg.recommended ? "border-blue-400 shadow-lg" : "border-gray-200"}
              ${selectedPackage === pkg.id ? "ring-2 ring-blue-500" : ""}
            `}
          >
            {pkg.recommended && (
              <div className="bg-blue-600 text-white text-center py-1 text-sm font-medium">
                Recomendado
              </div>
            )}

            <CardHeader>
              <CardTitle>{pkg.name}</CardTitle>
              <CardDescription>{pkg.credits} créditos</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  {formatCurrency(pkg.price)}
                </span>
                <span className="text-sm text-gray-500 ml-1">
                  (R$ {(pkg.price / pkg.credits / 100).toFixed(2)} por crédito)
                </span>
              </div>

              <ul className="space-y-2">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="text-green-500 h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-2" />
                <span>Válido por {pkg.validityDays} dias</span>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                variant={pkg.recommended ? "default" : "outline"}
                className="w-full"
                onClick={() => setSelectedPackage(pkg.id)}
                disabled={processing}
              >
                Selecionar
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Confirmar Compra</CardTitle>
              <CardDescription>
                Revise os detalhes da sua compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const pkg = plans.find((p) => p.id === selectedPackage);
                if (!pkg) return null;

                return (
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <div className="flex justify-between">
                        <span>Plano</span>
                        <span className="font-semibold">{pkg.name}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span>Créditos</span>
                        <span className="font-semibold">{pkg.credits}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span>Preço</span>
                        <span className="font-semibold">
                          {formatCurrency(pkg.price)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span>Validade</span>
                        <span className="font-semibold">
                          {pkg.validityDays} dias
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <div className="flex items-center mb-2">
                        <Shield className="text-blue-500 h-5 w-5 mr-2" />
                        <span className="font-medium">Pagamento Seguro</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Seus dados de pagamento são criptografados e processados
                        com segurança. Esta é uma simulação de compra para o
                        MVP.
                      </p>
                    </div>

                    {/* Preparação para futura integração com Stripe */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <CreditCard className="text-gray-500 h-5 w-5 mr-2" />
                        <span className="font-medium">Método de Pagamento</span>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-md text-sm text-gray-500 italic">
                        A integração com o gateway de pagamentos será
                        implementada futuramente. Por enquanto, a compra é
                        simulada para fins de demonstração.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedPackage(null)}
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button onClick={handlePurchase} disabled={processing}>
                {processing ? "Processando..." : "Confirmar Compra"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
