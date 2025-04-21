// backend/services/documentProcessingService.js

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const prisma = require("../lib/prisma");
const util = require("util");
const execAsync = util.promisify(exec);

class DocumentProcessingService {
  constructor() {
    this.tempDir = path.join(__dirname, "../temp");

    // Garantir que o diretório temporário existe
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
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

      // Obter o caminho do arquivo (assumindo que já foi salvo)
      const filePath = this._getDocumentPath(document);

      // Extrair texto com docling
      const extractedText = await this._extractTextWithDocling(
        filePath,
        document.type
      );

      // Dividir o texto em chunks
      const chunks = this._splitIntoChunks(extractedText);

      // Gerar embeddings para cada chunk
      const embeddingsResults = await this._generateEmbeddings(
        chunks,
        document.id
      );

      // Atualizar o status do documento
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "PROCESSED",
          metadata: {
            chunks: chunks.length,
            totalTokens: embeddingsResults.totalTokens,
            // Outras estatísticas relevantes
          },
        },
      });

      return {
        success: true,
        documentId,
        chunks: chunks.length,
      };
    } catch (error) {
      console.error(`Erro ao processar documento ${documentId}:`, error);

      // Atualizar status do documento para erro
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "ERROR",
          metadata: {
            error: error.message,
          },
        },
      });

      throw error;
    }
  }

  // Método para extrair texto de documentos usando docling
  async _extractTextWithDocling(filePath, fileType) {
    try {
      // Em um ambiente real, aqui chamaríamos o serviço Python com docling
      // Para este MVP, vamos simular a chamada

      console.log(`Extraindo texto de ${filePath} (tipo: ${fileType})`);

      // Simulação da chamada ao Python
      // const { stdout, stderr } = await execAsync(`python extract_text.py "${filePath}" "${fileType}"`);

      // Para teste, vamos ler o arquivo diretamente se for txt
      if (fileType.toLowerCase() === "txt") {
        return fs.readFileSync(filePath, "utf8");
      }

      // Para outros tipos, simular o resultado
      return `Conteúdo extraído do documento ${path.basename(filePath)}. 
      Este é um texto de exemplo que simula o conteúdo extraído de um documento ${fileType.toUpperCase()}.
      Em uma implementação real, usaremos docling para extrair o texto real do documento.
      Este texto é para fins de teste do sistema RAG.`;
    } catch (error) {
      console.error("Erro ao extrair texto com docling:", error);
      throw new Error(`Falha ao extrair texto: ${error.message}`);
    }
  }

  // Método para dividir texto em chunks
  _splitIntoChunks(text, maxChunkSize = 1000) {
    // Dividir por parágrafos
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      // Se o parágrafo já é maior que o tamanho máximo,
      // dividimos em frases e processamos
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
        // Verificar se adicionar este parágrafo ultrapassa o limite
        if (currentChunk.length + paragraph.length > maxChunkSize) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          if (currentChunk) currentChunk += "\n\n";
          currentChunk += paragraph;
        }
      }
    }

    // Adicionar o último chunk se não estiver vazio
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Método para gerar embeddings
  async _generateEmbeddings(chunks, documentId) {
    // Esta é uma implementação simulada
    // Em um ambiente real, chamaríamos a API do OpenAI ou outro serviço

    console.log(
      `Gerando embeddings para ${chunks.length} chunks do documento ${documentId}`
    );

    // Simular estrutura de retorno
    return {
      success: true,
      totalTokens: chunks.reduce((total, chunk) => total + chunk.length / 4, 0),
      chunks: chunks.length,
    };
  }

  // Obter o caminho do arquivo
  _getDocumentPath(document) {
    // Em uma implementação real, usaríamos o caminho real do arquivo
    // Para MVP, vamos simular um caminho
    return path.join(
      this.tempDir,
      `${document.id}.${document.type.toLowerCase()}`
    );
  }
}

module.exports = DocumentProcessingService;
