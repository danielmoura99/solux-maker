// backend/controllers/whatsappController.js

const prisma = require("../lib/prisma");
const ragService = require("../services/ragService");
const creditController = require("./creditController");

// Verificar webhook (exigido pela API do WhatsApp)
exports.verifyWebhook = async (req, res) => {
  try {
    // WhatsApp envia um token na query para verificar o webhook
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Verificar se o token é válido
    // Em produção, o token seria armazenado no .env ou no banco
    const verificationToken =
      process.env.WHATSAPP_VERIFICATION_TOKEN || "solux_token";

    if (mode === "subscribe" && token === verificationToken) {
      console.log("Webhook do WhatsApp verificado!");
      res.status(200).send(challenge);
    } else {
      console.error("Verificação do webhook falhou");
      res.sendStatus(403);
    }
  } catch (error) {
    console.error("Erro ao verificar webhook:", error);
    res.sendStatus(500);
  }
};

// Receber mensagens do WhatsApp
exports.receiveMessage = async (req, res) => {
  try {
    // Em produção, devemos validar a assinatura da requisição (X-Hub-Signature)
    const data = req.body;

    // Apenas responder imediatamente para WhatsApp saber que recebemos
    res.status(200).send("OK");

    // Processar a mensagem de forma assíncrona
    processWhatsAppMessage(data).catch((error) => {
      console.error("Erro ao processar mensagem do WhatsApp:", error);
    });
  } catch (error) {
    console.error("Erro ao receber mensagem do WhatsApp:", error);
    res.sendStatus(500);
  }
};

// Função para processar mensagens do WhatsApp assincronamente
async function processWhatsAppMessage(data) {
  try {
    // Verificar se é uma mensagem válida
    if (!data.object || data.object !== "whatsapp_business_account") {
      console.log("Evento não relacionado ao WhatsApp Business");
      return;
    }

    // Extrair as mensagens recebidas
    const entries = data.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const messages = change.value?.messages || [];
        const contacts = change.value?.contacts || [];
        const phone = change.value?.metadata?.display_phone_number;

        // Processar cada mensagem recebida
        for (const message of messages) {
          if (message.type !== "text") {
            // Por enquanto só vamos lidar com mensagens de texto
            console.log(`Mensagem de tipo ${message.type} não suportada ainda`);
            continue;
          }

          const from = message.from; // Número de telefone do remetente
          const messageId = message.id;
          const text = message.text?.body || "";

          // Buscar a empresa associada ao número de telefone
          const whatsAppConfig = await prisma.whatsAppConfig.findFirst({
            where: {
              phoneNumber: phone,
              active: true,
            },
            include: {
              company: true,
            },
          });

          if (!whatsAppConfig) {
            console.error(
              `Configuração WhatsApp não encontrada para o número ${phone}`
            );
            continue;
          }

          const companyId = whatsAppConfig.companyId;

          // Verificar se há uma conversa existente ou criar uma nova
          let conversation = await prisma.conversation.findFirst({
            where: {
              companyId,
              userId: from,
              channel: "WHATSAPP",
              status: "ACTIVE",
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          if (!conversation) {
            // Criar uma nova conversa
            conversation = await prisma.conversation.create({
              data: {
                companyId,
                userId: from,
                channel: "WHATSAPP",
                status: "ACTIVE",
              },
            });

            // Enviar mensagem de boas-vindas
            await sendWhatsAppMessage(
              phone,
              from,
              whatsAppConfig.welcomeMessage
            );

            // Registrar a mensagem de boas-vindas no banco
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                content: whatsAppConfig.welcomeMessage,
                type: "TEXT",
                sender: "ASSISTANT",
              },
            });
          }

          // Registrar a mensagem do usuário
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              content: text,
              type: "TEXT",
              sender: "USER",
              metadata: {
                messageId,
                from,
              },
            },
          });

          // Verificar se a empresa tem créditos suficientes
          const company = whatsAppConfig.company;
          if (company.credits <= 0) {
            console.log(
              `Empresa ${companyId} sem créditos suficientes para resposta`
            );
            await sendWhatsAppMessage(
              phone,
              from,
              "Desculpe, não foi possível processar sua solicitação no momento. Por favor, entre em contato com o suporte."
            );
            continue;
          }

          // Preparar resposta usando RAG
          const context = {
            companyId,
            companyName: company.name,
            conversationId: conversation.id,
            assistantName:
              company.assistantSettings?.name || "Assistente Virtual",
            tone: company.assistantSettings?.tone || "PROFESSIONAL",
          };

          // Criar instância do serviço RAG
          const ragServiceInstance = new ragService();

          // Processar a query com o RAG
          const result = await ragServiceInstance.processQuery(text, context);

          // Calcular custo em créditos
          const tokenUsage = result.metadata.tokenUsage;
          const model = result.metadata.model;

          // Consumir créditos
          await creditController.consumeCredits(
            companyId,
            tokenUsage,
            model,
            `Processamento de mensagem WhatsApp: ${tokenUsage.total} tokens`
          );

          // Enviar resposta para o usuário
          await sendWhatsAppMessage(phone, from, result.answer);

          // Registrar a resposta no banco
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              content: result.answer,
              type: "TEXT",
              sender: "ASSISTANT",
              metadata: {
                tokenUsage: result.metadata.tokenUsage,
                model: result.metadata.model,
                provider: result.metadata.provider,
                sources: result.sources,
              },
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Erro ao processar mensagem do WhatsApp:", error);
  }
}

// Função para enviar mensagem pelo WhatsApp
async function sendWhatsAppMessage(from, to, text) {
  try {
    // Esta função é um placeholder para a integração real com a API do WhatsApp
    // Em produção, seria substituída pela chamada real à API

    console.log(`[SIMULAÇÃO] Enviando mensagem WhatsApp:`);
    console.log(`De: ${from}`);
    console.log(`Para: ${to}`);
    console.log(`Mensagem: ${text}`);

    // Em produção, seria algo como:
    /*
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text }
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.WHATSAPP_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    */

    return true;
  } catch (error) {
    console.error("Erro ao enviar mensagem WhatsApp:", error);
    return false;
  }
}

// Obter configuração do WhatsApp para a empresa
exports.getConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Buscar configuração existente
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.json({
        exists: false,
        config: {
          phoneNumber: "",
          active: false,
          welcomeMessage: "Olá! Sou o assistente virtual. Como posso ajudar?",
          offHoursMessage:
            "Estamos fora do horário de atendimento. Retornaremos em breve.",
        },
      });
    }

    // Por segurança, não enviamos a apiKey completa
    const maskedConfig = {
      ...config,
      apiKey: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : null,
    };

    res.json({
      exists: true,
      config: maskedConfig,
    });
  } catch (error) {
    console.error("Erro ao obter configuração do WhatsApp:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Salvar configuração do WhatsApp
exports.saveConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { phoneNumber, apiKey, welcomeMessage, offHoursMessage } = req.body;

    // Validar dados
    if (!phoneNumber) {
      return res
        .status(400)
        .json({ message: "Número de telefone é obrigatório" });
    }

    // Normalizar número de telefone (remover espaços, traços, etc.)
    const normalizedPhone = phoneNumber.replace(/[^0-9+]/g, "");

    // Verificar se já existe uma configuração
    const existingConfig = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });

    let config;

    if (existingConfig) {
      // Atualizar configuração existente
      config = await prisma.whatsAppConfig.update({
        where: { companyId },
        data: {
          phoneNumber: normalizedPhone,
          // Só atualizamos a apiKey se for fornecida
          ...(apiKey && apiKey !== "••••••••" + existingConfig.apiKey?.slice(-4)
            ? { apiKey }
            : {}),
          welcomeMessage: welcomeMessage || existingConfig.welcomeMessage,
          offHoursMessage: offHoursMessage || existingConfig.offHoursMessage,
          // Não alteramos o status 'active' aqui
          updatedAt: new Date(),
        },
      });
    } else {
      // Criar nova configuração
      config = await prisma.whatsAppConfig.create({
        data: {
          companyId,
          phoneNumber: normalizedPhone,
          apiKey,
          welcomeMessage:
            welcomeMessage ||
            "Olá! Sou o assistente virtual. Como posso ajudar?",
          offHoursMessage:
            offHoursMessage ||
            "Estamos fora do horário de atendimento. Retornaremos em breve.",
          active: false, // Inicialmente inativo até ser verificado
          verificationToken: generateVerificationToken(),
        },
      });
    }

    // Mascarar apiKey na resposta
    const maskedConfig = {
      ...config,
      apiKey: config.apiKey ? "••••••••" + config.apiKey.slice(-4) : null,
    };

    res.json({
      success: true,
      config: maskedConfig,
      message: "Configuração salva com sucesso",
    });
  } catch (error) {
    console.error("Erro ao salvar configuração do WhatsApp:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Ativar a integração do WhatsApp
exports.activateConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Verificar se existe configuração
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.status(404).json({ message: "Configuração não encontrada" });
    }

    // Verificar se tem as informações necessárias
    if (!config.phoneNumber || !config.apiKey) {
      return res.status(400).json({
        message:
          "Configuração incompleta. Número de telefone e chave da API são obrigatórios",
      });
    }

    // Em um ambiente real, aqui validaríamos a chave da API com o WhatsApp
    // Por enquanto, apenas simulamos a validação

    // Atualizar status para ativo
    const updatedConfig = await prisma.whatsAppConfig.update({
      where: { companyId },
      data: {
        active: true,
        updatedAt: new Date(),
      },
    });

    // Mascarar apiKey na resposta
    const maskedConfig = {
      ...updatedConfig,
      apiKey: updatedConfig.apiKey
        ? "••••••••" + updatedConfig.apiKey.slice(-4)
        : null,
    };

    res.json({
      success: true,
      config: maskedConfig,
      message: "Integração com WhatsApp ativada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao ativar integração do WhatsApp:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Desativar a integração do WhatsApp
exports.deactivateConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Verificar se existe configuração
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return res.status(404).json({ message: "Configuração não encontrada" });
    }

    // Atualizar status para inativo
    const updatedConfig = await prisma.whatsAppConfig.update({
      where: { companyId },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    });

    // Mascarar apiKey na resposta
    const maskedConfig = {
      ...updatedConfig,
      apiKey: updatedConfig.apiKey
        ? "••••••••" + updatedConfig.apiKey.slice(-4)
        : null,
    };

    res.json({
      success: true,
      config: maskedConfig,
      message: "Integração com WhatsApp desativada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao desativar integração do WhatsApp:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Função de utilidade para gerar token de verificação
function generateVerificationToken() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 20; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
