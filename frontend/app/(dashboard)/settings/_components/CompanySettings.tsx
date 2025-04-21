// app/(dashboard)/settings/_components/CompanySettings.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type CompanyInfo = {
  id: string;
  name: string;
  email: string;
  credits: number;
  active: boolean;
};

export default function CompanySettings() {
  const { user } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        setLoading(true);
        const response = await api.get(`api/companies/${user?.companyId}`);
        setCompanyInfo(response.data);
        setName(response.data.name || "");
        setEmail(response.data.email || "");
      } catch (error) {
        console.error("Erro ao carregar informações da empresa:", error);
        toast.error("Erro ao carregar informações da empresa");
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchCompanyInfo();
    }
  }, [user]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      await api.put(`api/companies/${user?.companyId}`, {
        name,
        email,
      });

      toast.success("Informações da empresa atualizadas com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar informações da empresa:", error);
      toast.error("Erro ao atualizar informações da empresa");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleUpdateCompany}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nome da Empresa</Label>
          <Input
            id="companyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyEmail">Email da Empresa</Label>
          <Input
            id="companyEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="credits">Créditos</Label>
          <Input
            id="credits"
            value={companyInfo?.credits || 0}
            disabled
            className="bg-gray-50"
          />
          <p className="text-sm text-gray-500">
            Para adicionar créditos, acesse a seção de créditos
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Input
            id="status"
            value={companyInfo?.active ? "Ativo" : "Inativo"}
            disabled
            className="bg-gray-50"
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Atualizar Informações"}
        </Button>
      </div>
    </form>
  );
}
