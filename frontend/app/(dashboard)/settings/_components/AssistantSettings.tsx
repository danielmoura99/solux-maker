// app/(dashboard)/settings/_components/AssistantSettings.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type AssistantConfig = {
  name: string;
  tone: string;
  welcomeMessage: string;
  signatureMessage: string;
  workingHours: {
    start: string;
    end: string;
    timezone: string;
    weekdays: string[];
  };
};

const DEFAULT_CONFIG: AssistantConfig = {
  name: "Assistente Virtual",
  tone: "PROFESSIONAL",
  welcomeMessage: "Olá! Como posso ajudar você hoje?",
  signatureMessage: "Atenciosamente, Assistente Virtual",
  workingHours: {
    start: "09:00",
    end: "18:00",
    timezone: "America/Sao_Paulo",
    weekdays: ["1", "2", "3", "4", "5"], // Segunda a sexta
  },
};

export default function AssistantSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get(`api/companies/${user?.companyId}`);

        // Verificar se há configurações do assistente
        if (response.data.assistantSettings) {
          // Garantir que workingHours existe e tem todas as propriedades necessárias
          const assistantSettings = response.data.assistantSettings;

          setConfig({
            name: assistantSettings.name || DEFAULT_CONFIG.name,
            tone: assistantSettings.tone || DEFAULT_CONFIG.tone,
            welcomeMessage:
              assistantSettings.welcomeMessage || DEFAULT_CONFIG.welcomeMessage,
            signatureMessage:
              assistantSettings.signatureMessage ||
              DEFAULT_CONFIG.signatureMessage,
            workingHours: {
              start:
                assistantSettings.workingHours?.start ||
                DEFAULT_CONFIG.workingHours.start,
              end:
                assistantSettings.workingHours?.end ||
                DEFAULT_CONFIG.workingHours.end,
              timezone:
                assistantSettings.workingHours?.timezone ||
                DEFAULT_CONFIG.workingHours.timezone,
              weekdays:
                assistantSettings.workingHours?.weekdays ||
                DEFAULT_CONFIG.workingHours.weekdays,
            },
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast.error("Erro ao carregar configurações do assistente");
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchSettings();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      await api.put(`api/companies/${user?.companyId}`, {
        assistantSettings: config,
      });

      toast.success("Configurações do assistente salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações do assistente");
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (day: string) => {
    const currentDays = [...(config.workingHours.weekdays || [])];

    if (currentDays.includes(day)) {
      setConfig({
        ...config,
        workingHours: {
          ...config.workingHours,
          weekdays: currentDays.filter((d) => d !== day),
        },
      });
    } else {
      setConfig({
        ...config,
        workingHours: {
          ...config.workingHours,
          weekdays: [...currentDays, day],
        },
      });
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
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="assistantName">Nome do Assistente</Label>
          <Input
            id="assistantName"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            placeholder="Nome do seu assistente virtual"
          />
          <p className="text-sm text-gray-500">
            Este nome será exibido para seus clientes nas conversas
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone">Tom de Voz</Label>
          <Select
            value={config.tone}
            onValueChange={(value) => setConfig({ ...config, tone: value })}
          >
            <SelectTrigger id="tone">
              <SelectValue placeholder="Selecione um tom de voz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASUAL">Casual e Amigável</SelectItem>
              <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
              <SelectItem value="FORMAL">Formal</SelectItem>
              <SelectItem value="TECHNICAL">Técnico</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            Define como seu assistente se comunica com os clientes
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
          <Textarea
            id="welcomeMessage"
            value={config.welcomeMessage}
            onChange={(e) =>
              setConfig({ ...config, welcomeMessage: e.target.value })
            }
            placeholder="Mensagem inicial que será exibida em novas conversas"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signatureMessage">Mensagem de Assinatura</Label>
          <Input
            id="signatureMessage"
            value={config.signatureMessage}
            onChange={(e) =>
              setConfig({ ...config, signatureMessage: e.target.value })
            }
            placeholder="Assinatura para as mensagens do assistente"
          />
        </div>

        <div className="space-y-2">
          <Label>Horário de Funcionamento</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime" className="text-sm">
                Início
              </Label>
              <Input
                id="startTime"
                type="time"
                value={config.workingHours.start}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    workingHours: {
                      ...config.workingHours,
                      start: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-sm">
                Fim
              </Label>
              <Input
                id="endTime"
                type="time"
                value={config.workingHours.end}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    workingHours: {
                      ...config.workingHours,
                      end: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dias de Funcionamento</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "0", label: "Dom" },
              { value: "1", label: "Seg" },
              { value: "2", label: "Ter" },
              { value: "3", label: "Qua" },
              { value: "4", label: "Qui" },
              { value: "5", label: "Sex" },
              { value: "6", label: "Sáb" },
            ].map((day) => (
              <Button
                key={day.value}
                type="button"
                variant={
                  config.workingHours.weekdays?.includes(day.value)
                    ? "default"
                    : "outline"
                }
                className="h-9 w-9 p-0"
                onClick={() => handleDayToggle(day.value)}
              >
                {day.label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Dias em que seu assistente estará ativo
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </form>
  );
}
