// frontend/app/(dashboard)/settings/_components/WhatsAppSettings.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type WhatsAppConfig = {
  id?: string;
  phoneNumber: string;
  apiKey: string | null;
  welcomeMessage: string;
  offHoursMessage: string;
  active: boolean;
  verificationToken?: string;
};

export default function WhatsAppSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig>({
    phoneNumber: "",
    apiKey: null,
    welcomeMessage: "Olá! Sou o assistente virtual. Como posso ajudar?",
    offHoursMessage:
      "Estamos fora do horário de atendimento. Retornaremos em breve.",
    active: false,
  });
  const [configExists, setConfigExists] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await api.get("api/whatsapp/config");

        if (response.data.exists) {
          setConfig(response.data.config);
          setConfigExists(true);
        }
      } catch (error) {
        console.error("Erro ao carregar configuração do WhatsApp:", error);
        toast.error("Erro ao carregar configuração do WhatsApp");
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchConfig();
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const response = await api.post("api/whatsapp/config", {
        phoneNumber: config.phoneNumber,
        apiKey: config.apiKey,
        welcomeMessage: config.welcomeMessage,
        offHoursMessage: config.offHoursMessage,
      });

      setConfig(response.data.config);
      setConfigExists(true);
      toast.success("Configuração do WhatsApp salva com sucesso");
    } catch (error) {
      console.error("Erro ao salvar configuração do WhatsApp:", error);
      toast.error("Erro ao salvar configuração do WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      setSaving(true);

      if (config.active) {
        // Desativar
        const response = await api.put("api/whatsapp/config/deactivate");
        setConfig(response.data.config);
        toast.success("Integração com WhatsApp desativada");
      } else {
        // Ativar
        const response = await api.put("api/whatsapp/config/activate");
        setConfig(response.data.config);
        toast.success("Integração com WhatsApp ativada");
      }
    } catch (error) {
      console.error("Erro ao alterar status da integração:", error);
      toast.error("Erro ao alterar status da integração");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    // URL do webhook - em produção, seria a URL real da aplicação
    const webhookUrl = `https://seudominio.com/api/whatsapp/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada para a área de transferência");
  };

  const copyVerificationToken = () => {
    if (config.verificationToken) {
      navigator.clipboard.writeText(config.verificationToken);
      toast.success(
        "Token de verificação copiado para a área de transferência"
      );
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
    <div className="space-y-6">
      <form onSubmit={handleSave}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Integração com WhatsApp</h3>
              <p className="text-sm text-gray-500">
                Configure a integração com WhatsApp Business API para
                atendimento automatizado
              </p>
            </div>

            {configExists && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.active}
                  onCheckedChange={handleToggleActive}
                  disabled={saving || !configExists}
                />
                <span>{config.active ? "Ativo" : "Inativo"}</span>
              </div>
            )}
          </div>

          {configExists && !config.active && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">
                Integração Inativa
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                A integração com WhatsApp está configurada, mas não está ativa.
                Ative-a para começar a receber mensagens.
              </AlertDescription>
            </Alert>
          )}

          {configExists && config.active && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                Integração Ativa
              </AlertTitle>
              <AlertDescription className="text-green-700">
                Sua integração com WhatsApp está ativa e funcionando. Os
                clientes podem enviar mensagens para o número configurado.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Número de Telefone</Label>
            <Input
              id="phoneNumber"
              value={config.phoneNumber}
              onChange={(e) =>
                setConfig({ ...config, phoneNumber: e.target.value })
              }
              placeholder="Ex: +5511999998888"
            />
            <p className="text-sm text-gray-500">
              Número de telefone completo com código do país (Ex:
              +5511999998888)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">Chave da API do WhatsApp Business</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey || ""}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Chave da API do WhatsApp Business"
            />
            <p className="text-sm text-gray-500">
              Encontre esta chave no painel do WhatsApp Business
            </p>
          </div>

          {configExists && (
            <div className="space-y-2 p-4 border rounded-md bg-gray-50">
              <h4 className="font-medium">Configuração do Webhook</h4>
              <p className="text-sm text-gray-500 mb-2">
                Configure estas informações no painel do WhatsApp Business API
              </p>

              <div className="flex justify-between items-center mb-2">
                <Label>URL do Webhook</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyWebhookUrl}
                  type="button"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <div className="bg-gray-100 p-2 rounded text-sm font-mono mb-4">
                https://seudominio.com/api/whatsapp/webhook
              </div>

              {config.verificationToken && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Token de Verificação</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyVerificationToken}
                      type="button"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                    {config.verificationToken}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
            <Textarea
              id="welcomeMessage"
              value={config.welcomeMessage}
              onChange={(e) =>
                setConfig({ ...config, welcomeMessage: e.target.value })
              }
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Esta mensagem será enviada quando um cliente iniciar uma conversa
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offHoursMessage">Mensagem Fora do Horário</Label>
            <Textarea
              id="offHoursMessage"
              value={config.offHoursMessage}
              onChange={(e) =>
                setConfig({ ...config, offHoursMessage: e.target.value })
              }
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Esta mensagem será enviada quando um cliente enviar mensagens fora
              do horário configurado
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
