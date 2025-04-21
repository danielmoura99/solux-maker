// backend/services/ragService.js (atualizado)

const LLMService = require("./llmService");
const EmbeddingService = require("./embeddingService");
const prisma = require("../lib/prisma");

class RAGService {
  constructor(options = {}) {
    this.llmService = new LLMService(options.llmProvider);
    this.embeddingService = new EmbeddingService();
  }

  // Método principal para processar uma pergunta e gerar resposta com RAG
  async processQuery(query, context = {}) {
    try {
      // 1. Gerar embedding para a query
      const queryEmbeddingResult =
        await this.embeddingService.generateEmbedding(query);

      // 2. Recuperar documentos relevantes
      const relevantDocs = await this._retrieveRelevantDocs(
        query,
        queryEmbeddingResult.embedding,
        context
      );

      // 3. Construir o prompt com o contexto recuperado
      const prompt = this._buildPromptWithContext(query, relevantDocs, context);

      // 4. Gerar resposta usando o LLM
      const llmResponse = await this.llmService.generateText(prompt, {
        systemPrompt: this._getSystemPrompt(context),
        temperature: 0.3, // Temperatura baixa para respostas mais precisas
      });

      // 5. Registrar uso e créditos
      await this._logUsage(
        query,
        llmResponse,
        context,
        queryEmbeddingResult.tokenUsage
      );

      return {
        answer: llmResponse.text,
        sources: relevantDocs.map((doc) => ({
          id: doc.id,
          title: doc.metadata?.title || "Documento sem título",
          snippet: doc.snippet || doc.content.substring(0, 150) + "...",
        })),
        metadata: {
          tokenUsage: {
            ...llmResponse.tokenUsage,
            embedding: queryEmbeddingResult.tokenUsage,
            total:
              llmResponse.tokenUsage.total + queryEmbeddingResult.tokenUsage,
          },
          model: llmResponse.model,
          provider: llmResponse.provider,
        },
      };
    } catch (error) {
      console.error("Erro ao processar query com RAG:", error);
      throw error;
    }
  }

  // Recuperar documentos relevantes baseados na query
  async _retrieveRelevantDocs(query, queryEmbedding, context) {
    const companyId = context.companyId;

    try {
      // Em uma implementação real, usaríamos um banco de dados vetorial
      // Para o MVP, vamos usar uma busca simples nos chunks do documento

      // Buscar todos os chunks de documentos da empresa
      const documents = await prisma.document.findMany({
        where: {
          companyId,
          status: "PROCESSED",
        },
        select: {
          id: true,
          name: true,
          type: true,
          metadata: true,
        },
      });

      // Como não temos embeddings reais armazenados ainda,
      // vamos retornar alguns chunks como exemplo
      const simulatedResults = [];

      for (const doc of documents) {
        // Criar snippets simulados
        simulatedResults.push({
          id: doc.id,
          documentId: doc.id,
          content: `Este é um trecho extraído do documento ${doc.name}. Ele contém informações que poderiam ser relevantes para a consulta "${query}".`,
          metadata: {
            title: doc.name,
            type: doc.type,
          },
          similarity: 0.85, // Similaridade simulada
        });
      }

      // Se não encontrou nada, retornar lista vazia
      if (simulatedResults.length === 0) {
        return [];
      }

      // Ordenar por similaridade e pegar os top 3
      return simulatedResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
    } catch (error) {
      console.error("Erro ao recuperar documentos relevantes:", error);
      return [];
    }
  }

  _buildPromptWithContext(query, docs, context) {
    const contextText =
      docs.length > 0
        ? `Contexto:\n${docs.map((doc) => doc.content).join("\n\n")}`
        : "Não foram encontrados documentos relevantes para esta pergunta.";

    return `
${contextText}

Pergunta do usuário: ${query}

Responda à pergunta acima baseando-se no contexto fornecido. Se a resposta não estiver no contexto, responda que você não tem informações suficientes para responder com precisão.
`;
  }

  _getSystemPrompt(context) {
    const companyName = context.companyName || "nossa empresa";
    const assistantName = context.assistantName || "Assistente Virtual";
    const tone = context.tone || "PROFESSIONAL";

    let toneInstruction = "";
    switch (tone) {
      case "CASUAL":
        toneInstruction =
          "Use uma linguagem casual e amigável. Seja conversacional e use termos cotidianos.";
        break;
      case "PROFESSIONAL":
        toneInstruction =
          "Use uma linguagem profissional e objetiva. Seja claro e direto.";
        break;
      case "FORMAL":
        toneInstruction =
          "Use uma linguagem formal e respeitosa. Evite contrações e gírias.";
        break;
      case "TECHNICAL":
        toneInstruction =
          "Use uma linguagem técnica e precisa. Inclua terminologia específica quando apropriado.";
        break;
      default:
        toneInstruction =
          "Use uma linguagem profissional e objetiva. Seja claro e direto.";
    }

    return `
Você é ${assistantName}, o assistente virtual de ${companyName}. 
${toneInstruction}
Suas respostas devem ser baseadas apenas nas informações fornecidas no contexto.
Não invente informações ou fatos que não estejam no contexto.
Se você não souber a resposta, diga claramente que você não tem essa informação disponível.
Mantenha suas respostas concisas e diretas, indo direto ao ponto.
`;
  }

  async _logUsage(query, llmResponse, context, embeddingTokens) {
    // Em uma implementação real, registraríamos em um banco de dados
    console.log("Uso de tokens:", {
      llm: llmResponse.tokenUsage,
      embedding: embeddingTokens,
      total: llmResponse.tokenUsage.total + embeddingTokens,
      conversationId: context.conversationId,
      companyId: context.companyId,
    });

    return true;
  }
}

module.exports = RAGService;
