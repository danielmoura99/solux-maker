// backend/controllers/whatsappController.js

const whatsappService = require("../services/whatsappService");
const prisma = require("../lib/prisma");

// Armazenar conexões SSE ativas por empresa
const connections = new Map();

/**
 * Inicializa o cliente WhatsApp para uma empresa
 */
exports.initializeWhatsApp = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    // Inicializar o cliente WhatsApp
    const { events } = await whatsappService.initClient(companyId);

    // Retornar sucesso
    res.status(200).json({
      message: "Inicialização do WhatsApp em andamento. Aguardando QR code.",
      status: "INITIALIZING",
    });
  } catch (error) {
    console.error("Erro ao inicializar WhatsApp:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

/**
 * Obtém o status da conexão WhatsApp de uma empresa
 */
exports.getWhatsAppStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Buscar informações da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        assistantSettings: true,
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    // Verificar se há informações de WhatsApp
    const whatsappStatus =
      company.assistantSettings?.whatsappStatus || "NOT_CONFIGURED";
    const whatsappInfo = company.assistantSettings?.whatsappInfo || null;

    res.status(200).json({
      status: whatsappStatus,
      info: whatsappInfo,
      lastUpdated: company.assistantSettings?.whatsappStatusUpdatedAt,
    });
  } catch (error) {
    console.error("Erro ao obter status do WhatsApp:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

/**
 * Estabelece uma conexão SSE (Server-Sent Events) para receber eventos do WhatsApp
 */
exports.whatsappEvents = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Configurar cabeçalhos para SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Função para enviar eventos para o cliente
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Armazenar conexão para esta empresa
    if (!connections.has(companyId)) {
      connections.set(companyId, []);
    }
    connections.get(companyId).push(sendEvent);

    // Enviar evento inicial
    sendEvent("connected", { message: "Conexão estabelecida" });

    // Inicializar cliente WhatsApp (se ainda não estiver inicializado)
    const { events } = await whatsappService.initClient(companyId);

    // Configurar ouvintes de eventos específicos para esta empresa
    const qrListener = (qrcode) => {
      sendEvent("qr", { qrcode });
    };

    const readyListener = () => {
      sendEvent("ready", { message: "WhatsApp conectado com sucesso" });
    };

    const authenticatedListener = () => {
      sendEvent("authenticated", { message: "Autenticação bem-sucedida" });
    };

    const errorListener = (error) => {
      sendEvent("error", { message: error.toString() });
    };

    const disconnectedListener = (reason) => {
      sendEvent("disconnected", { message: reason });
    };

    // Registrar ouvintes
    events.on(`${companyId}:qr`, qrListener);
    events.on(`${companyId}:ready`, readyListener);
    events.on(`${companyId}:authenticated`, authenticatedListener);
    events.on(`${companyId}:error`, errorListener);
    events.on(`${companyId}:disconnected`, disconnectedListener);

    // Lidar com o fechamento da conexão
    req.on("close", () => {
      // Remover ouvintes para evitar vazamento de memória
      events.off(`${companyId}:qr`, qrListener);
      events.off(`${companyId}:ready`, readyListener);
      events.off(`${companyId}:authenticated`, authenticatedListener);
      events.off(`${companyId}:error`, errorListener);
      events.off(`${companyId}:disconnected`, disconnectedListener);

      // Remover conexão da lista
      const companyConnections = connections.get(companyId) || [];
      const index = companyConnections.indexOf(sendEvent);
      if (index !== -1) {
        companyConnections.splice(index, 1);
      }

      console.log(`Conexão SSE fechada para empresa ${companyId}`);
    });
  } catch (error) {
    console.error("Erro ao configurar eventos do WhatsApp:", error);
    res.status(500).end();
  }
};

/**
 * Envia uma mensagem WhatsApp
 */
exports.sendWhatsAppMessage = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { to, message, conversationId } = req.body;

    if (!to || !message) {
      return res
        .status(400)
        .json({ message: "Número de destino e mensagem são obrigatórios" });
    }

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    // Verificar se há uma sessão ativa para a empresa
    const status = company.assistantSettings?.whatsappStatus;
    if (status !== "CONNECTED") {
      return res.status(400).json({
        message: "WhatsApp não está conectado",
        status: status || "NOT_CONFIGURED",
      });
    }

    // Enviar mensagem
    const result = await whatsappService.sendMessage(companyId, to, message);

    // Se houver um ID de conversa, salvar a mensagem no banco de dados
    if (conversationId) {
      // Verificar se a conversa existe e pertence à empresa
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          companyId,
        },
      });

      if (conversation) {
        await prisma.message.create({
          data: {
            conversationId,
            content: message,
            type: "TEXT",
            sender: "ASSISTANT",
          },
        });
      }
    }

    res.status(200).json({
      message: "Mensagem enviada com sucesso",
      result,
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem WhatsApp:", error);
    res.status(500).json({ message: "Erro ao enviar mensagem" });
  }
};

/**
 * Desconecta o cliente WhatsApp de uma empresa
 */
exports.disconnectWhatsApp = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Desconectar o cliente
    await whatsappService.disconnect(companyId);

    res.status(200).json({ message: "WhatsApp desconectado com sucesso" });
  } catch (error) {
    console.error("Erro ao desconectar WhatsApp:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
