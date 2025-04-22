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
    const topK = 3; // Número de chunks mais relevantes a recuperar

    try {
      // Buscar todos os documentos da empresa
      const documents = await prisma.document.findMany({
        where: {
          companyId,
          status: "PROCESSED",
        },
        include: {
          chunks: {
            select: {
              id: true,
              content: true,
              embedding: true,
              chunkIndex: true,
            },
          },
        },
      });

      console.log(`Encontrados ${documents.length} documentos processados`);

      // Lista para armazenar todos os chunks com suas similaridades
      const allChunksWithSimilarity = [];

      // Para cada documento, calcular similaridade entre sua query e seus chunks
      for (const doc of documents) {
        for (const chunk of doc.chunks) {
          // Converter o embedding de Buffer para Float32Array
          const embeddingArray = new Float32Array(
            new Uint8Array(chunk.embedding).buffer
          );

          // Calcular similaridade entre a query e o chunk
          const similarity = this.embeddingService.calculateSimilarity(
            queryEmbedding,
            Array.from(embeddingArray)
          );

          allChunksWithSimilarity.push({
            id: chunk.id,
            documentId: doc.id,
            documentName: doc.name,
            documentType: doc.type,
            content: chunk.content,
            similarity,
          });
        }
      }

      // Ordenar por similaridade e pegar os top K chunks
      const topChunks = allChunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      console.log(`Recuperados ${topChunks.length} chunks mais relevantes`);

      return topChunks;
    } catch (error) {
      console.error("Erro ao recuperar documentos relevantes:", error);
      return [];
    }
  }

  _buildPromptWithContext(query, relevantDocs, context) {
    if (relevantDocs.length === 0) {
      return `
  Pergunta do usuário: ${query}
  
  Não tenho informações específicas sobre esta pergunta em minha base de conhecimento. Por favor, responda com base em seu conhecimento geral, ou informe que não tem informações suficientes para responder com precisão.
  `;
    }

    // Construir o contexto a partir dos documentos relevantes
    const contextText = relevantDocs
      .map((doc, index) => {
        return `Trecho ${index + 1} (do documento "${doc.documentName}"):
  ${doc.content}
  
  `;
      })
      .join("\n");

    return `
  Contexto relevante:
  ${contextText}
  
  Pergunta do usuário: ${query}
  
  Responda à pergunta do usuário apenas usando as informações fornecidas no contexto acima. 
  Se a resposta não estiver no contexto, responda honestamente que você não tem informações suficientes para responder com precisão.
  Não invente informações.
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
