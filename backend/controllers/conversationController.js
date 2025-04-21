// backend/controllers/conversationController.js

const prisma = require("../lib/prisma");

// Iniciar uma nova conversa
exports.startConversation = async (req, res) => {
  try {
    const { userId, channel } = req.body;
    const companyId = req.user.companyId;

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(400).json({ message: "Empresa não encontrada" });
    }

    // Verificar se há créditos suficientes
    if (company.credits <= 0) {
      return res
        .status(400)
        .json({ message: "Créditos insuficientes para iniciar conversa" });
    }

    // Criar a conversa
    const newConversation = await prisma.conversation.create({
      data: {
        companyId,
        userId,
        channel,
        status: "ACTIVE",
      },
    });

    res.status(201).json(newConversation);
  } catch (error) {
    console.error("Erro ao iniciar conversa:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Adicionar mensagem a uma conversa
exports.addMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type, sender } = req.body;
    const companyId = req.user.companyId;

    // Verificar se a conversa existe e pertence à empresa
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        companyId,
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversa não encontrada" });
    }

    // Verificar se a conversa está ativa
    if (conversation.status !== "ACTIVE") {
      return res.status(400).json({ message: "Esta conversa não está ativa" });
    }

    // Se for mensagem do assistente, verificar créditos
    if (sender === "ASSISTANT") {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (company.credits <= 0) {
        return res
          .status(400)
          .json({ message: "Créditos insuficientes para enviar mensagem" });
      }

      // Em uma implementação real, aqui debitaríamos os créditos com base no tamanho
      // da mensagem e/ou uso da API de LLM
    }

    // Adicionar a mensagem
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        content,
        type,
        sender,
        metadata: {
          // Aqui colocaríamos informações como custo da mensagem em créditos
          // ou outras informações relevantes
        },
      },
    });

    // Aqui seria onde enviaríamos a mensagem para o WhatsApp ou outro canal,
    // se fosse uma mensagem de resposta

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erro ao adicionar mensagem:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Obter o histórico de uma conversa
exports.getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const companyId = req.user.companyId;

    // Verificar se a conversa existe e pertence à empresa
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        companyId,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversa não encontrada" });
    }

    res.json(conversation);
  } catch (error) {
    console.error("Erro ao buscar histórico da conversa:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Listar conversas
exports.listConversations = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, limit = 10, offset = 0 } = req.query;

    const whereClause = {
      companyId,
    };

    if (status) {
      whereClause.status = status;
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        messages: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1, // Pegar apenas a mensagem mais recente
        },
        _count: {
          select: { messages: true },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Contar o total de conversas para paginação
    const total = await prisma.conversation.count({
      where: whereClause,
    });

    res.json({
      conversations,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Erro ao listar conversas:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Encerrar uma conversa
exports.closeConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const companyId = req.user.companyId;

    // Verificar se a conversa existe e pertence à empresa
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        companyId,
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversa não encontrada" });
    }

    // Atualizar o status da conversa
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "CLOSED",
      },
    });

    res.json(updatedConversation);
  } catch (error) {
    console.error("Erro ao encerrar conversa:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
