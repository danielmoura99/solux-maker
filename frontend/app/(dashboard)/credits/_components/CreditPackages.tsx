// app/(dashboard)/credits/_components/CreditPackages.tsx

"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";

// Neste MVP, o pagamento real não está integrado,
// então é apenas uma simulação da compra de créditos

const PACKAGES = [
  {
    id: "basic",
    name: "Básico",
    credits: 100,
    price: "R$ 50,00",
    features: ["100 créditos", "Suporte por email", "Válido por 30 dias"],
    recommended: false,
  },
  {
    id: "standard",
    name: "Padrão",
    credits: 300,
    price: "R$ 120,00",
    features: [
      "300 créditos",
      "Suporte por email e chat",
      "Válido por 60 dias",
      "20% de desconto no valor",
    ],
    recommended: true,
  },
  {
    id: "premium",
    name: "Premium",
    credits: 1000,
    price: "R$ 300,00",
    features: [
      "1000 créditos",
      "Suporte prioritário",
      "Válido por 90 dias",
      "40% de desconto no valor",
    ],
    recommended: false,
  },
];

interface CreditPackagesProps {
  onSuccess: () => void;
}

export default function CreditPackages({ onSuccess }: CreditPackagesProps) {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Simulação de compra - apenas para demonstração
  // (na implementação real, integraria com gateway de pagamento)
  const handlePurchase = async () => {
    if (!selectedPackage) return;

    const pkg = PACKAGES.find((p) => p.id === selectedPackage);
    if (!pkg) return;

    try {
      setProcessing(true);

      // Chamada simulada - em um ambiente real, haveria integração com pagamentos
      // Este endpoint deve ser usado apenas por administradores em produção
      // await api.post(`api/companies/${user?.companyId}/credits`, {
      //   amount: pkg.credits,
      //   description: `Compra de pacote ${pkg.name}`,
      // });

      toast.success(`Compra do pacote ${pkg.name} realizada com sucesso!`);
      toast.info(
        "Esta é uma simulação. Em produção, utilizaria um gateway de pagamentos."
      );

      // Informativo para o processo de desenvolvimento
      toast.info(
        `No próximo sprint, implementaremos a integração com gateway de pagamentos.`
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PACKAGES.map((pkg) => (
        <div
          key={pkg.id}
          className={`
            border rounded-lg overflow-hidden transition-all
            ${pkg.recommended ? "border-blue-400 shadow-lg" : "border-gray-200"}
            ${selectedPackage === pkg.id ? "ring-2 ring-blue-500" : ""}
          `}
        >
          {pkg.recommended && (
            <div className="bg-blue-600 text-white text-center py-1 text-sm font-medium">
              Recomendado
            </div>
          )}

          <div className="p-6">
            <h3 className="text-lg font-bold">{pkg.name}</h3>
            <div className="mt-4 mb-6">
              <div className="text-3xl font-bold">{pkg.price}</div>
              <div className="text-sm text-gray-500">
                {pkg.credits} créditos
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              {pkg.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="text-green-500 h-4 w-4 mr-2" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={pkg.recommended ? "default" : "outline"}
              className="w-full"
              onClick={() => setSelectedPackage(pkg.id)}
              disabled={processing}
            >
              Selecionar
            </Button>
          </div>
        </div>
      ))}

      {selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirmar Compra</h3>

            <p className="mb-6">
              Você está comprando o pacote{" "}
              {PACKAGES.find((p) => p.id === selectedPackage)?.name}
              com {PACKAGES.find((p) => p.id === selectedPackage)?.credits}{" "}
              créditos por{" "}
              {PACKAGES.find((p) => p.id === selectedPackage)?.price}.
            </p>

            <div className="flex justify-end space-x-2">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
