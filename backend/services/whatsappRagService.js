// backend/services/whatsappRagService.js

const RAGService = require("./ragService");
const whatsappService = require("./whatsappService");
const prisma = require("../lib/prisma");
const creditController = require("../controllers/creditController");

/**
 * Serviço para integrar o WhatsApp com o sistema RAG
 */
class WhatsAppRAGService {
  constructor() {
    this.ragService = new RAGService();
  }

  /**
   * Processa uma mensagem recebida do WhatsApp e gera resposta usando RAG
   * @param {string} companyId - ID da empresa
   * @param {string} conversationId - ID da conversa
   * @param {string} query - Pergunta/mensagem do usuário
   * @param {string} from - Número do remetente
   */
  async processWhatsAppMessage(companyId, conversationId, query, from) {
    try {
      console.log(
        `Processando mensagem WhatsApp para companhia ${companyId}, conversa ${conversationId}`
      );

      // Buscar informações da empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        console.error(`Empresa não encontrada: ${companyId}`);
        return {
          success: false,
          error: "Empresa não encontrada",
        };
      }

      // Verificar se há créditos suficientes
      if (company.credits <= 0) {
        console.log(`Empresa ${companyId} sem créditos suficientes`);

        // Enviar mensagem de erro para o usuário
        const errorMessage =
          "Desculpe, não foi possível processar sua solicitação no momento. Por favor, entre em contato com o suporte.";

        try {
          await whatsappService.sendMessage(companyId, from, errorMessage);

          // Registrar a mensagem no banco
          await prisma.message.create({
            data: {
              conversationId,
              content: errorMessage,
              type: "TEXT",
              sender: "ASSISTANT",
            },
          });
        } catch (sendError) {
          console.error("Erro ao enviar mensagem de erro:", sendError);
        }

        return {
          success: false,
          error: "Créditos insuficientes",
        };
      }

      // Preparar contexto para o RAG
      const context = {
        companyId,
        companyName: company.name,
        conversationId,
        assistantName: company.assistantSettings?.name || "Assistente Virtual",
        tone: company.assistantSettings?.tone || "PROFESSIONAL",
      };

      // Processar a query com o RAG
      const result = await this.ragService.processQuery(query, context);

      // Calcular custo em créditos
      const tokenUsage = result.metadata.tokenUsage;
      const model = result.metadata.model;

      // Consumir créditos
      try {
        await creditController.consumeCredits(
          companyId,
          tokenUsage,
          model,
          `Processamento de mensagem WhatsApp: ${tokenUsage.total} tokens`
        );
      } catch (creditError) {
        console.error("Erro ao consumir créditos:", creditError);
        // Continuar processamento mesmo com erro no débito de créditos
      }

      // Registrar a mensagem do assistente
      await prisma.message.create({
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
          },
        },
      });

      // Enviar resposta via WhatsApp
      try {
        await whatsappService.sendMessage(companyId, from, result.answer);
      } catch (sendError) {
        console.error("Erro ao enviar resposta via WhatsApp:", sendError);
        // Continuar processamento mesmo com erro no envio
      }

      return {
        success: true,
        answer: result.answer,
        sources: result.sources,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("Erro no processamento WhatsApp-RAG:", error);
      return {
        success: false,
        error: error.message || "Erro interno no processamento",
      };
    }
  }
}

module.exports = new WhatsAppRAGService();
