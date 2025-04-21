// backend/controllers/companyController.js

const prisma = require("../lib/prisma");

// Criar uma nova empresa
exports.createCompany = async (req, res) => {
  try {
    console.log("Tentando criar empresa:", req.body);
    const { name, email, assistantSettings } = req.body;

    // Verificar se a empresa já existe
    const existingCompany = await prisma.company.findUnique({
      where: { email },
    });

    if (existingCompany) {
      return res
        .status(400)
        .json({ message: "Email já cadastrado para outra empresa" });
    }

    // Criar a empresa
    const newCompany = await prisma.company.create({
      data: {
        name,
        email,
        credits: 0, // Créditos iniciais gratuitos
        assistantSettings: assistantSettings || {},
      },
    });

    res.status(201).json(newCompany);
  } catch (error) {
    console.error("Erro ao criar empresa:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Obter detalhes de uma empresa
exports.getCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário tem permissão para acessar esta empresa
    const userCompanyId = req.user.companyId;
    if (req.user.role !== "SUPER_ADMIN" && userCompanyId !== id) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    res.json(company);
  } catch (error) {
    console.error("Erro ao buscar empresa:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Atualizar uma empresa
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, assistantSettings, active } = req.body;

    // Verificar se o usuário tem permissão para atualizar esta empresa
    const userCompanyId = req.user.companyId;
    if (req.user.role !== "SUPER_ADMIN" && userCompanyId !== id) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    // Atualizar a empresa
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        name: name !== undefined ? name : company.name,
        email: email !== undefined ? email : company.email,
        assistantSettings:
          assistantSettings !== undefined
            ? assistantSettings
            : company.assistantSettings,
        active: active !== undefined ? active : company.active,
      },
    });

    res.json(updatedCompany);
  } catch (error) {
    console.error("Erro ao atualizar empresa:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Adicionar créditos a uma empresa
exports.addCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    // Verificar se é um super admin (apenas super admin pode adicionar créditos)
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    // Iniciar uma transação para garantir a consistência dos dados
    const result = await prisma.$transaction(async (prisma) => {
      // Atualizar o saldo de créditos da empresa
      const updatedCompany = await prisma.company.update({
        where: { id },
        data: {
          credits: {
            increment: amount,
          },
        },
      });

      // Registrar a transação de créditos
      await prisma.creditTransaction.create({
        data: {
          companyId: id,
          amount,
          operationType: "ADD",
          balanceAfter: updatedCompany.credits,
          description: description || "Adição manual de créditos",
        },
      });

      return updatedCompany;
    });

    res.json(result);
  } catch (error) {
    console.error("Erro ao adicionar créditos:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Listar todas as empresas (apenas para super admin)
exports.listCompanies = async (req, res) => {
  try {
    // Verificar se é um super admin
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const companies = await prisma.company.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            documents: true,
            conversations: true,
          },
        },
      },
    });

    res.json(companies);
  } catch (error) {
    console.error("Erro ao listar empresas:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
