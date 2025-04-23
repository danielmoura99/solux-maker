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
    const startTime = Date.now();

    try {
      // 1. Gerar embedding para a query
      console.log("Gerando embedding para a query");
      const queryEmbeddingResult =
        await this.embeddingService.generateEmbedding(query);

      // 2. Recuperar documentos relevantes com parâmetros configuraveis
      const queryContext = {
        ...context,
        topK: context.topK || 3,
        similarityThreshold: context.similarityThreshold || 0.6,
      };

      console.log("Buscando documentos relevantes");
      const relevantDocs = await this._retrieveRelevantDocs(
        query,
        queryEmbeddingResult.embedding,
        queryContext
      );

      // 3. Construir o prompt com o contexto recuperado
      console.log("Construindo prompt com contexto");
      const prompt = this._buildPromptWithContext(query, relevantDocs, context);

      // 4. Gerar resposta usando o LLM
      console.log("Gerando resposta com LLM");
      const llmResponse = await this.llmService.generateText(prompt, {
        systemPrompt: this._getSystemPrompt(context),
        temperature: context.temperature || 0.3,
        maxTokens: context.maxTokens || 800,
      });

      // Calcular tempo de resposta
      const responseTime = Date.now() - startTime;

      // Preparar resultado
      const result = {
        answer: llmResponse.text,
        sources: relevantDocs.map((doc) => ({
          id: doc.id,
          documentId: doc.documentId,
          documentName: doc.documentName,
          similarity: doc.similarity,
          snippet: doc.content.substring(0, 150) + "...",
        })),
        metadata: {
          tokenUsage: {
            ...llmResponse.tokenUsage,
            embedding: queryEmbeddingResult.tokenUsage,
            total:
              llmResponse.tokenUsage.total + queryEmbeddingResult.tokenUsage,
          },
          responseTime: responseTime,
          model: llmResponse.model,
          provider: llmResponse.provider,
        },
      };

      // Registrar métricas
      this._logQueryMetrics(query, result);

      return result;
    } catch (error) {
      console.error("Erro ao processar query com RAG:", error);
      throw error;
    }
  }

  // Recuperar documentos relevantes baseados na query
  async _retrieveRelevantDocs(query, queryEmbedding, context) {
    const companyId = context.companyId;
    const topK = context.topK || 3; // Parametrizado o número de resultados
    const similarityThreshold = context.similarityThreshold || 0.6; // Threshold mínimo de similaridade

    try {
      console.log(`Buscando documentos relevantes para empresa ${companyId}`);

      // Buscar apenas documentos processados da empresa
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

      // Buscar chunks em uma consulta separada para melhor performance
      const docIds = documents.map((doc) => doc.id);
      const chunks = await prisma.documentChunk.findMany({
        where: {
          documentId: { in: docIds },
        },
        select: {
          id: true,
          documentId: true,
          content: true,
          embedding: true,
          chunkIndex: true,
        },
      });

      // Criar um mapa para lookup rápido de documentos
      const documentsMap = documents.reduce((map, doc) => {
        map[doc.id] = doc;
        return map;
      }, {});

      // Calcular similaridade para todos os chunks
      const chunksWithSimilarity = chunks.map((chunk) => {
        // Converter o embedding de Buffer para Float32Array
        const embeddingArray = new Float32Array(
          new Uint8Array(chunk.embedding).buffer
        );

        // Calcular similaridade
        const similarity = this.embeddingService.calculateSimilarity(
          queryEmbedding,
          Array.from(embeddingArray)
        );

        const doc = documentsMap[chunk.documentId];

        return {
          id: chunk.id,
          documentId: chunk.documentId,
          documentName: doc.name,
          documentType: doc.type,
          content: chunk.content,
          similarity,
          chunkIndex: chunk.chunkIndex,
        };
      });

      // Filtrar por threshold mínimo de similaridade
      const relevantChunks = chunksWithSimilarity
        .filter((chunk) => chunk.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      console.log(`Encontrados ${relevantChunks.length} chunks relevantes`);

      // Se não encontrarmos chunks relevantes, retornamos os top chunks mesmo abaixo do threshold
      if (relevantChunks.length === 0 && chunksWithSimilarity.length > 0) {
        console.log(
          "Não foram encontrados chunks acima do threshold, usando os melhores disponíveis"
        );
        return chunksWithSimilarity
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK);
      }

      return relevantChunks;
    } catch (error) {
      console.error("Erro ao recuperar documentos relevantes:", error);
      return [];
    }
  }

  _buildPromptWithContext(query, relevantDocs, context) {
    // Se não houver documentos relevantes
    if (relevantDocs.length === 0) {
      return `
  Pergunta do usuário: ${query}
  
  Não encontrei informações específicas sobre esta pergunta na base de conhecimento da empresa. 
  Por favor, responda com base no seu conhecimento geral, mas indique claramente para o usuário 
  que sua resposta não tem como base a documentação da empresa. Ofereça também sugestões 
  de como o usuário poderia reformular a pergunta para obter resultados mais relevantes.
  `;
    }

    // Organizar documentos por similaridade e incluir informações sobre a fonte
    const contextText = relevantDocs
      .map((doc, index) => {
        // Formatando para melhor identificação da fonte
        return `FONTE ${index + 1}: [Documento: "${doc.documentName}", Tipo: ${doc.documentType}, Relevância: ${(doc.similarity * 100).toFixed(1)}%]
  CONTEÚDO: ${doc.content.trim()}
  
  `;
      })
      .join("\n");

    // Instruções mais detalhadas para o modelo
    return `
  CONTEXTO DA EMPRESA:
  ${contextText}
  
  PERGUNTA DO USUÁRIO: ${query}
  
  INSTRUÇÕES DE RESPOSTA:
  1. Responda à pergunta do usuário APENAS usando as informações fornecidas no contexto acima.
  2. Se a resposta estiver presente no contexto, forneça uma resposta detalhada e precisa.
  3. Se a resposta estiver parcialmente no contexto, responda o que for possível com base no contexto e indique quais partes da pergunta não podem ser respondidas.
  4. Se a resposta NÃO estiver no contexto, responda honestamente: "Não encontrei informações sobre isso na documentação da empresa."
  5. NÃO invente ou presuma informações que não estejam explicitamente contidas no contexto.
  6. Use uma linguagem clara e direta, adequada ao tom definido nas configurações.
  7. Cite as fontes específicas (número da fonte) que você usou para compor sua resposta quando apropriado.
  `;
  }

  _getSystemPrompt(context) {
    const companyName = context.companyName || "nossa empresa";
    const assistantName = context.assistantName || "Assistente Virtual";
    const tone = context.tone || "PROFESSIONAL";

    // Definições de tom mais detalhadas
    let toneInstruction = "";
    switch (tone) {
      case "CASUAL":
        toneInstruction = `
  Use uma linguagem casual e amigável. Seja conversacional, use contrações e termos cotidianos.
  Mantenha um tom acolhedor e próximo, como se estivesse conversando com um amigo.
  Pode usar alguns emojis ocasionalmente para expressar emoções, mas sem exageros.`;
        break;
      case "PROFESSIONAL":
        toneInstruction = `
  Use uma linguagem profissional e objetiva. Seja claro, direto e conciso.
  Mantenha uma postura formal, mas acessível e sem jargões desnecessários.
  Enfatize precisão e confiabilidade em suas respostas.`;
        break;
      case "FORMAL":
        toneInstruction = `
  Use uma linguagem formal e respeitosa. Evite contrações e gírias.
  Mantenha um tom que reflita expertise e seriedade.
  Use vocabulário mais sofisticado quando apropriado, mas sem comprometer a clareza.`;
        break;
      case "TECHNICAL":
        toneInstruction = `
  Use uma linguagem técnica e precisa. Inclua terminologia específica quando apropriado.
  Não simplifique excessivamente conceitos técnicos.
  Presuma que o usuário tem conhecimento básico da área e forneça detalhes técnicos relevantes.`;
        break;
      default:
        toneInstruction = `
  Use uma linguagem profissional e objetiva. Seja claro e direto.
  Mantenha um equilíbrio entre formalidade e acessibilidade.`;
    }

    // Sistema prompt melhorado com instruções mais específicas
    return `
  Você é ${assistantName}, o assistente virtual oficial de ${companyName}.
  ${toneInstruction}
  
  DIRETRIZES GERAIS:
  1. Suas respostas devem ser baseadas exclusivamente nas informações fornecidas no contexto.
  2. Nunca invente informações ou fatos que não estejam no contexto fornecido.
  3. Se você não souber a resposta, diga claramente que não tem essa informação disponível na documentação da empresa.
  4. Mantenha suas respostas concisas e diretas, indo direto ao ponto.
  5. Quando citar informações específicas, mencione a fonte do documento quando possível.
  6. Seja útil e resolva o problema do usuário na medida do possível com as informações disponíveis.
  7. Evite respostas genéricas quando tiver informações específicas no contexto.
  8. Se a pergunta for ambígua, peça esclarecimentos ao usuário.
  
  Você representa ${companyName} e deve transmitir confiabilidade e competência em todas as interações.
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

  // Método para registrar métricas de consulta
  async _logQueryMetrics(query, results, userFeedback = null) {
    try {
      // Estrutura de métricas para esta consulta
      const metrics = {
        timestamp: new Date(),
        query: query,
        numResults: results.sources?.length || 0,
        topSimilarityScore: results.sources[0]?.similarity || 0,
        responseTime: results.metadata?.responseTime || 0,
        tokensUsed: results.metadata?.tokenUsage?.total || 0,
        userFeedback: userFeedback,
      };

      // Em uma implementação real, salvaríamos isso no banco
      // Por enquanto, apenas logamos
      console.log("RAG METRICS:", JSON.stringify(metrics));

      // Futuramente, podemos implementar:
      // await prisma.ragMetric.create({ data: metrics });

      return true;
    } catch (error) {
      console.error("Erro ao registrar métricas RAG:", error);
      return false;
    }
  }

  // Método para registrar feedback do usuário
  async recordFeedback(queryId, feedback) {
    try {
      // Exemplo: feedback pode ser { helpful: true, accurate: true, comments: "..." }
      console.log(`Registrando feedback para query ${queryId}:`, feedback);

      // Em implementação real, salvaríamos no banco
      // await prisma.ragFeedback.create({ data: { queryId, ...feedback } });

      // Atualizar métricas com o feedback
      this._logQueryMetrics(null, { queryId }, feedback);

      return true;
    } catch (error) {
      console.error("Erro ao registrar feedback:", error);
      return false;
    }
  }
}

module.exports = RAGService;
