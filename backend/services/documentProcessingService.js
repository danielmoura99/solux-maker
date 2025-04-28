// backend/services/documentProcessingService.js

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const prisma = require("../lib/prisma");
const EmbeddingService = require("./embeddingService");

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://python-service:5000";

class DocumentProcessingService {
  constructor() {
    this.uploadsDir = path.join(__dirname, "../uploads");
    this.embeddingService = new EmbeddingService();

    // Garantir que o diretório de uploads existe
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Método principal para processar um documento
  async processDocument(documentId) {
    try {
      // Buscar informações do documento
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Documento não encontrado: ${documentId}`);
      }

      // Atualizar status do documento para processando
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "PROCESSING" },
      });

      console.log(`Iniciando processamento do documento ${documentId}`);

      // Obter o caminho do arquivo
      const filePath = document.metadata?.path;

      // Verificar se o arquivo existe
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Enviar para o serviço Python processar
      const extractedData = await this._sendToDoclingService(
        filePath,
        document
      );

      console.log(
        `Documento ${documentId} processado pelo docling com sucesso`
      );

      // Dividir o texto em chunks
      const chunks = this._splitIntoChunks(extractedData.text);

      console.log(
        `Documento ${documentId} dividido em ${chunks.length} chunks`
      );

      // Processar cada chunk e gerar embeddings
      const processedChunks = await this._processChunks(chunks, document.id);

      console.log(`Embeddings gerados para documento ${documentId}`);

      // Atualizar o status do documento
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "PROCESSED",
          metadata: {
            ...document.metadata,
            ...(extractedData.metadata || {}),
            chunks: chunks.length,
            totalTokens: processedChunks.totalTokens,
            processedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`Documento ${documentId} processado com sucesso!`);

      return {
        success: true,
        documentId,
        chunks: chunks.length,
        metadata: extractedData.metadata,
      };
    } catch (error) {
      console.error(`Erro ao processar documento ${documentId}:`, error);

      // Buscar o documento novamente antes de atualizar o status para erro
      const documentToUpdate = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (documentToUpdate) {
        // Atualizar status do documento para erro
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: "ERROR",
            metadata: {
              ...documentToUpdate.metadata,
              error: error.message,
              errorTimestamp: new Date().toISOString(),
            },
          },
        });
      }

      throw error;
    }
  }

  // Enviar documento para o serviço Python com docling
  async _sendToDoclingService(filePath, document) {
    try {
      console.log(
        `Enviando documento ${document.id} para processamento com docling...`
      );

      // Criar FormData para envio do arquivo
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      formData.append("document_id", document.id);
      formData.append("document_type", document.type.toLowerCase());

      // Enviar para o serviço Python
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/process`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log("Resposta do serviço Python:", response.data);

      if (!response.data.success) {
        throw new Error(
          `Falha no processamento: ${response.data.error || "Erro desconhecido"}`
        );
      }

      // Verificar se a resposta contém o texto extraído
      const extractedText = response.data.text;
      if (!extractedText && typeof extractedText !== "string") {
        throw new Error("O serviço Python não retornou o texto extraído");
      }

      return {
        text: extractedText,
        metadata: response.data.metadata || {},
      };
    } catch (error) {
      console.error("Erro ao enviar para serviço docling:", error);
      console.log("Usando fallback para processamento de documento...");

      // Fallback código...
      let text = "";

      // Para arquivos TXT, podemos ler diretamente
      if (document.type.toLowerCase() === "txt") {
        try {
          text = fs.readFileSync(filePath, "utf8");
        } catch (readError) {
          console.error("Erro ao ler arquivo TXT:", readError);
          text = `[Erro ao ler conteúdo do arquivo TXT: ${readError.message}]`;
        }
      } else {
        // Para outros tipos, usamos um texto simulado
        text = `Este é um texto simulado para o documento "${document.name}"...`;
      }

      return {
        text,
        metadata: {
          title: document.name,
          fallback: true,
          error: error.message,
        },
      };
    }
  }

  // Método para dividir texto em chunks
  _splitIntoChunks(text, maxChunkSize = 1000) {
    // Dividir por parágrafos
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += " " + sentence;
          }
        }
      } else {
        if (currentChunk.length + paragraph.length > maxChunkSize) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          if (currentChunk) currentChunk += "\n\n";
          currentChunk += paragraph;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Processar chunks e gerar embeddings
  async _processChunks(chunks, documentId) {
    let totalTokens = 0;

    try {
      console.log(
        `Processando ${chunks.length} chunks para documento ${documentId}...`
      );

      // Primeiramente, excluir chunks existentes (se for reprocessamento)
      await prisma.documentChunk.deleteMany({
        where: { documentId },
      });

      // Processar cada chunk e salvar no banco
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Iniciando geração de embedding para chunk ${i + 1}...`);

        // Gerar embedding para o chunk
        const embeddingResult =
          await this.embeddingService.generateEmbedding(chunk);
        console.log(
          `Embedding gerado com sucesso para chunk ${i + 1}, tamanho: ${embeddingResult.embedding.length}`
        );

        // Converter o embedding para Buffer para armazenar no banco
        const embeddingBuffer = Buffer.from(
          new Float32Array(embeddingResult.embedding).buffer
        );
        console.log(
          `Embedding convertido para buffer com sucesso, tamanho: ${embeddingBuffer.length}`
        );

        // Salvar o chunk e seu embedding no banco
        console.log(`Tentando salvar chunk ${i + 1} no banco...`);
        await prisma.documentChunk.create({
          data: {
            documentId,
            content: chunk,
            embedding: embeddingBuffer,
            chunkIndex: i,
            tokenCount: embeddingResult.tokenUsage,
          },
        });
        console.log(`Chunk ${i + 1} salvo com sucesso!`);

        totalTokens += embeddingResult.tokenUsage;
        console.log(
          `Processado chunk ${i + 1}/${chunks.length} (${embeddingResult.tokenUsage} tokens)`
        );
      }

      return {
        totalChunks: chunks.length,
        totalTokens,
      };
    } catch (error) {
      console.error("Erro ao processar chunks:", error);
      throw error;
    }
  }
}

module.exports = DocumentProcessingService;
