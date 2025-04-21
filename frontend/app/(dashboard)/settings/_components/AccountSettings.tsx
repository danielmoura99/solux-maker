// app/(dashboard)/settings/_components/AccountSettings.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type UserInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const response = await api.get(`api/auth/profile`);
        setUserInfo(response.data);
        setName(response.data.name || "");
      } catch (error) {
        console.error("Erro ao carregar informações do usuário:", error);
        toast.error("Erro ao carregar informações do usuário");
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchUserInfo();
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      // Esta chamada de API não está realmente implementada no backend,
      // seria necessário criar este endpoint
      await api.put(`api/users/${user?.id}`, { name });

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    try {
      setSaving(true);

      // Esta chamada de API não está realmente implementada no backend,
      // seria necessário criar este endpoint
      await api.put(`api/users/${user?.id}/password`, {
        currentPassword,
        newPassword,
      });

      toast.success("Senha alterada com sucesso!");

      // Limpar campos
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error("Erro ao alterar senha");
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
    <div className="space-y-8">
      <form onSubmit={handleUpdateProfile}>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informações Pessoais</h3>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={userInfo?.email || ""}
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-gray-500">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Input
              id="role"
              value={
                userInfo?.role === "ADMIN"
                  ? "Administrador"
                  : userInfo?.role === "SUPER_ADMIN"
                    ? "Super Administrador"
                    : "Usuário"
              }
              disabled
              className="bg-gray-50"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Atualizar Perfil"}
          </Button>
        </div>
      </form>

      <Separator />

      <form onSubmit={handleChangePassword}>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Alterar Senha</h3>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </form>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Sessão</h3>

        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={logout}
        >
          Sair da Conta
        </Button>
      </div>
    </div>
  );
}
