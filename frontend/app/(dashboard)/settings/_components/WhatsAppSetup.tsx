// app/(dashboard)/settings/_components/WhatsAppSetup.tsx - VERSÃO CORRIGIDA

"use client";

import { useEffect, useState, useRef } from "react"; // Adicionado useRef
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  QrCode,
  Smartphone,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// Status possíveis da integração WhatsApp
type WhatsAppStatus =
  | "NOT_CONFIGURED"
  | "INITIALIZING"
  | "WAITING_QR_SCAN"
  | "CONNECTED"
  | "DISCONNECTED"
  | "AUTH_FAILED"
  | "CONNECTION_ERROR"; // Adicionado novo status

// Informações da conta WhatsApp conectada
type WhatsAppInfo = {
  number: string;
  connectedAt: string;
};

interface WhatsAppSetupProps {
  // Propriedades opcionais para customização
  showCard?: boolean;
}

export default function WhatsAppSetup({ showCard = true }: WhatsAppSetupProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>("NOT_CONFIGURED");
  const [info, setInfo] = useState<WhatsAppInfo | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0); // Contador de tentativas
  const eventSourceRef = useRef<EventSource | null>(null); // Referência para o EventSource

  // Verificar status atual
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get("api/whatsapp/status");
      setStatus(response.data.status);
      setInfo(response.data.info);
    } catch (error) {
      console.error("Erro ao verificar status do WhatsApp:", error);
      toast.error("Erro ao verificar status do WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  // Inicializar ao carregar o componente
  useEffect(() => {
    if (user?.companyId) {
      fetchStatus();
    }

    // Limpar EventSource ao desmontar componente
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user]);

  // Iniciar conexão com WhatsApp
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setQrCode(null);
      setRetryCount(0); // Resetar contador de tentativas

      // Inicializar cliente WhatsApp
      await api.post("api/whatsapp/initialize");

      // Configurar evento source para receber eventos em tempo real
      setupEventSource();

      setStatus("INITIALIZING");
      toast.info("Iniciando conexão com WhatsApp...");
    } catch (error) {
      console.error("Erro ao iniciar conexão com WhatsApp:", error);
      toast.error("Erro ao iniciar conexão com WhatsApp");
      setConnecting(false);
      setStatus("CONNECTION_ERROR");
    }
  };

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    try {
      setConnecting(true);
      await api.post("api/whatsapp/disconnect");
      setStatus("DISCONNECTED");
      setInfo(null);
      toast.success("WhatsApp desconectado com sucesso");
    } catch (error) {
      console.error("Erro ao desconectar WhatsApp:", error);
      toast.error("Erro ao desconectar WhatsApp");
    } finally {
      setConnecting(false);
    }
  };

  // Configurar SSE (Server-Sent Events) para receber atualizações em tempo real
  const setupEventSource = () => {
    // Fechar EventSource existente se houver
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Obter o URL base da API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

    // Criar novo EventSource com URL absoluto
    const eventSource = new EventSource(`${baseUrl}/api/whatsapp/events`);
    eventSourceRef.current = eventSource;

    // Configurar handlers para eventos
    eventSource.addEventListener("connected", (event: MessageEvent) => {
      console.log("Conexão SSE estabelecida");
      setRetryCount(0); // Resetar contador de tentativas em caso de sucesso
    });

    eventSource.addEventListener("qr", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setQrCode(data.qrcode);
        setStatus("WAITING_QR_SCAN");
        setRetryCount(0); // Resetar contador se receber QR code com sucesso
      } catch (error) {
        console.error("Erro ao processar QR code:", error);
      }
    });

    eventSource.addEventListener("ready", (event: MessageEvent) => {
      setStatus("CONNECTED");
      setConnecting(false);
      toast.success("WhatsApp conectado com sucesso!");
      fetchStatus(); // Buscar detalhes atualizados

      // Fechar a conexão SSE depois de conectado com sucesso
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    });

    eventSource.addEventListener("authenticated", (event: MessageEvent) => {
      toast.success("Autenticação bem-sucedida");
      setRetryCount(0); // Resetar contador de tentativas
    });

    eventSource.addEventListener("error", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        toast.error(`Erro: ${data.message}`);
      } catch (error) {
        toast.error("Ocorreu um erro na conexão WhatsApp");
      }
      setConnecting(false);
      setStatus("CONNECTION_ERROR");
    });

    eventSource.addEventListener("disconnected", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        toast.info(`WhatsApp desconectado: ${data.message}`);
      } catch (error) {
        toast.info("WhatsApp desconectado");
      }
      setStatus("DISCONNECTED");
      setConnecting(false);
    });

    // Configurar handler para erros no SSE
    eventSource.onerror = () => {
      console.error("Erro na conexão SSE");

      // Tentativa de reconexão com backoff exponencial
      const maxRetries = 3; // Número máximo de tentativas
      if (retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Backoff exponencial: 1s, 2s, 4s...

        console.log(`Tentando reconectar em ${retryDelay / 1000} segundos...`);
        toast.info(
          `Problema de conexão, tentando novamente em ${retryDelay / 1000}s...`
        );

        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          setupEventSource(); // Tentar reconectar
        }, retryDelay);
      } else {
        // Desistir após várias tentativas
        eventSource.close();
        setConnecting(false);
        setStatus("CONNECTION_ERROR");
        toast.error(
          "Não foi possível estabelecer conexão com o servidor. Tente novamente mais tarde."
        );
      }
    };
  };

  // Renderizar conteúdo com base no status
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      );
    }

    // Se houver erro de conexão, mostrar mensagem e opção de tentar novamente
    if (status === "CONNECTION_ERROR") {
      return (
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
            <h3 className="font-medium">Erro de Conexão</h3>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              Não foi possível estabelecer conexão com o servidor para a
              integração do WhatsApp. Isso pode ocorrer devido a:
            </p>
            <ul className="list-disc list-inside text-sm text-red-700 mt-2">
              <li>Problemas de conectividade de rede</li>
              <li>Servidor temporariamente indisponível</li>
              <li>Configurações de firewall ou proxy</li>
            </ul>
          </div>

          <Button onClick={handleConnect} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      );
    }

    if (status === "WAITING_QR_SCAN" && qrCode) {
      return (
        <div className="flex flex-col items-center p-6">
          <h3 className="font-medium text-center mb-4">
            Escaneie o QR Code com seu WhatsApp
          </h3>
          <div className="border p-4 rounded-lg bg-white">
            <img
              src={qrCode}
              alt="QR Code para WhatsApp"
              className="max-w-full h-auto"
              width={256}
              height={256}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Abra o WhatsApp no seu telefone, vá para Configurações &gt;
            Dispositivos Conectados &gt; Conectar um Dispositivo
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleConnect}
            disabled={connecting}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar novo QR Code
          </Button>
        </div>
      );
    }

    if (status === "CONNECTED" && info) {
      return (
        <div className="p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            <h3 className="font-medium">WhatsApp Conectado</h3>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex items-center">
              <Smartphone className="h-5 w-5 text-gray-500 mr-2" />
              <span className="font-medium">Número:</span>
              <span className="ml-2">{info.number.split("@")[0]}</span>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Conectado em: {new Date(info.connectedAt).toLocaleString()}
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Seu assistente agora pode receber e enviar mensagens pelo WhatsApp.
            Mantenha esta conexão ativa para continuar utilizando o serviço.
          </p>

          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleDisconnect}
            disabled={connecting}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Desconectar WhatsApp
          </Button>
        </div>
      );
    }

    // Status padrão (NOT_CONFIGURED, DISCONNECTED, etc)
    return (
      <div className="p-6">
        <h3 className="font-medium mb-4">Conecte seu WhatsApp</h3>
        <p className="text-sm text-gray-500 mb-6">
          Conecte uma conta WhatsApp para permitir que seu assistente virtual
          interaja com seus clientes através do WhatsApp.
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium text-blue-800 mb-2">Como funciona:</h4>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Clique no botão abaixo para iniciar</li>
            <li>Escaneie o QR code com seu WhatsApp</li>
            <li>Aguarde a confirmação da conexão</li>
          </ol>
        </div>

        <Button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full"
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Smartphone className="mr-2 h-4 w-4" />
              Conectar WhatsApp
            </>
          )}
        </Button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Utilizamos WhatsApp Web para esta conexão. Seu número de telefone e
          mensagens são tratados de acordo com nossa política de privacidade.
        </p>
      </div>
    );
  };

  // Renderizar com ou sem o Card envolvente, dependendo da prop
  if (showCard) {
    return <Card className="overflow-hidden">{renderContent()}</Card>;
  }

  return renderContent();
}

// Adicionar tipagem para objeto global window
declare global {
  interface Window {
    eventSource: EventSource;
  }
}
