// backend/controllers/creditController.js

const prisma = require("../lib/prisma");

// Obter histórico de transações de créditos
exports.getCreditHistory = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { limit = 20, offset = 0 } = req.query;

    // Buscar transações de créditos
    const transactions = await prisma.creditTransaction.findMany({
      where: {
        companyId,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Contar o total de transações
    const total = await prisma.creditTransaction.count({
      where: {
        companyId,
      },
    });

    // Obter o saldo atual
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { credits: true },
    });

    res.json({
      transactions,
      currentBalance: company.credits,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar histórico de créditos:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Consumir créditos (para uso interno, chamado por outros controladores)
exports.consumeCredits = async (companyId, amount, description) => {
  try {
    // Iniciar transação para garantir consistência
    return await prisma.$transaction(async (prisma) => {
      // Verificar saldo atual
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (company.credits < amount) {
        throw new Error("Créditos insuficientes");
      }

      // Atualizar saldo
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });

      // Registrar transação
      await prisma.creditTransaction.create({
        data: {
          companyId,
          amount,
          operationType: "SUBTRACT",
          balanceAfter: updatedCompany.credits,
          description: description || "Consumo de créditos",
        },
      });

      return updatedCompany;
    });
  } catch (error) {
    console.error("Erro ao consumir créditos:", error);
    throw error;
  }
};
