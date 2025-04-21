// backend/controllers/documentController.js

const prisma = require("../lib/prisma");
const DocumentProcessingService = require("../services/documentProcessingService");
const fs = require("fs");
const path = require("path");
const util = require("util");
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

// Inicializar o serviço de processamento
const documentProcessingService = new DocumentProcessingService();

// Adicionar novo documento
exports.addDocument = async (req, res) => {
  try {
    const { name, type } = req.body;
    const fileContent = req.file ? req.file.buffer : null;
    const companyId = req.user.companyId;

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(400).json({ message: "Empresa não encontrada" });
    }

    // Verificar se o arquivo foi enviado
    if (!fileContent) {
      return res.status(400).json({ message: "Arquivo não fornecido" });
    }

    // Criar o documento
    const newDocument = await prisma.document.create({
      data: {
        name,
        type,
        status: "PENDING", // Inicialmente o documento está pendente
        companyId,
      },
    });

    // Criar diretório para salvar os arquivos se não existir
    const uploadDir = path.join(__dirname, "../uploads", companyId);
    await mkdir(uploadDir, { recursive: true });

    // Salvar o arquivo
    const filePath = path.join(
      uploadDir,
      `${newDocument.id}.${type.toLowerCase()}`
    );
    await writeFile(filePath, fileContent);

    // Iniciar processamento assíncrono
    documentProcessingService
      .processDocument(newDocument.id)
      .then(() => {
        console.log(`Documento ${newDocument.id} processado com sucesso`);
      })
      .catch((error) => {
        console.error(`Erro ao processar documento ${newDocument.id}:`, error);
      });

    res.status(201).json(newDocument);
  } catch (error) {
    console.error("Erro ao adicionar documento:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
// Listar documentos de uma empresa
exports.listDocuments = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const documents = await prisma.document.findMany({
      where: { companyId },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(documents);
  } catch (error) {
    console.error("Erro ao listar documentos:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Obter detalhes de um documento
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const document = await prisma.document.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    res.json(document);
  } catch (error) {
    console.error("Erro ao buscar documento:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Atualizar status de um documento
exports.updateDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, metadata } = req.body;
    const companyId = req.user.companyId;

    // Verificar se o documento existe e pertence à empresa
    const document = await prisma.document.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    // Atualizar o status do documento
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status,
        metadata: metadata || document.metadata,
      },
    });

    res.json(updatedDocument);
  } catch (error) {
    console.error("Erro ao atualizar status do documento:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Excluir um documento
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Verificar se o documento existe e pertence à empresa
    const document = await prisma.document.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    // Excluir o documento
    await prisma.document.delete({
      where: { id },
    });

    res.json({ message: "Documento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir documento:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
