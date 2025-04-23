// backend/controllers/assistantController.js

const RAGService = require("../services/ragService");
const prisma = require("../lib/prisma");
const creditController = require("./creditController");

// Inicializar o serviço RAG
const ragService = new RAGService();

// Processar uma pergunta e gerar resposta
exports.processQuery = async (req, res) => {
  try {
    const { query, conversationId } = req.body;
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
            timestamp: "desc",
          },
          take: 5, // Pegar as 5 mensagens mais recentes para contexto
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversa não encontrada" });
    }

    // Verificar se a empresa tem créditos suficientes
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        assistantSettings: true,
      },
    });

    if (company.credits <= 0) {
      return res.status(400).json({ message: "Créditos insuficientes" });
    }

    // Preparar contexto para o RAG
    const context = {
      companyId,
      companyName: company.name,
      conversationId,
      assistantName: company.assistantSettings?.name || "Assistente Virtual",
      tone: company.assistantSettings?.tone || "PROFESSIONAL",
      recentMessages: conversation.messages,
    };

    // Processar a query com o RAG
    const result = await ragService.processQuery(query, context);

    // Calcular custo em créditos baseado em tokens
    const tokenUsage = result.metadata.tokenUsage;
    const model = result.metadata.model;

    // Consumir créditos usando a nova função
    const creditResult = await creditController.consumeCredits(
      companyId,
      tokenUsage,
      model,
      `Processamento de mensagem: ${tokenUsage.total} tokens com modelo ${model}`
    );

    // Registrar a mensagem do assistente
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        content: result.answer,
        type: "TEXT",
        sender: "ASSISTANT",
        metadata: {
          tokenUsage: result.metadata.tokenUsage,
          model: result.metadata.model,
          provider: result.metadata.provider,
          sources: result.sources,
          creditCost: creditResult.creditCost,
        },
      },
    });

    // Atualizar a timestamp da conversa
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: newMessage,
      metadata: {
        tokenUsage: result.metadata.tokenUsage,
        creditCost: creditResult.creditCost,
        sources: result.sources,
      },
    });
  } catch (error) {
    console.error("Erro ao processar consulta:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

exports.testLLM = async (req, res) => {
  try {
    const { query } = req.body;

    // Criar uma instância do serviço LLM
    const llmService = new (require("../services/llmService"))();

    // Fazer uma chamada direta ao LLM
    const result = await llmService.generateText(query, {
      systemPrompt: "Você é um assistente de teste. Responda de forma concisa.",
      temperature: 0.7,
    });

    return res.status(200).json({
      response: result.text,
      metadata: {
        provider: result.provider,
        model: result.model,
        tokenUsage: result.tokenUsage,
      },
    });
  } catch (error) {
    console.error("Erro ao testar LLM:", error);
    res.status(500).json({
      message: "Erro ao testar LLM",
      error: error.message,
      details: error.response?.data,
    });
  }
};

// Método para testar o sistema RAG
exports.testRAG = async (req, res) => {
  try {
    const { query } = req.body;
    const companyId = req.user.companyId;

    // Buscar a empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(400).json({ message: "Empresa não encontrada" });
    }

    // Verificar créditos
    if (company.credits <= 0) {
      return res.status(400).json({ message: "Créditos insuficientes" });
    }

    // Preparar contexto
    const context = {
      companyId,
      companyName: company.name,
      assistantName: company.assistantSettings?.name || "Assistente Virtual",
      tone: company.assistantSettings?.tone || "PROFESSIONAL",
    };

    // Instanciar serviço RAG
    const ragService = new RAGService();

    // Processar a query com o RAG
    const result = await ragService.processQuery(query, context);

    // Calcular custo em créditos
    const totalTokens = result.metadata.tokenUsage.total;
    const creditCost = Math.ceil(totalTokens / 100);

    // Consumir créditos
    await creditController.consumeCredits(
      companyId,
      creditCost,
      `Teste RAG: ${totalTokens} tokens`
    );

    return res.status(200).json({
      answer: result.answer,
      sources: result.sources,
      metadata: {
        tokenUsage: result.metadata.tokenUsage,
        creditCost,
      },
    });
  } catch (error) {
    console.error("Erro ao testar RAG:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
