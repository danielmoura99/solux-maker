// backend/controllers/creditController.js

const prisma = require("../lib/prisma");
const NotificationService = require("../services/notificationService");
const notificationService = new NotificationService();

// Planos de crédito disponíveis
const CREDIT_PLANS = [
  {
    id: "basic",
    name: "Básico",
    credits: 100,
    price: 5000, // em centavos (R$ 50,00)
    description: "Ideal para testes e pequenas empresas",
    validityDays: 30,
  },
  {
    id: "standard",
    name: "Padrão",
    credits: 300,
    price: 12000, // em centavos (R$ 120,00)
    description: "Para uso moderado com 20% de desconto",
    validityDays: 60,
  },
  {
    id: "premium",
    name: "Premium",
    credits: 1000,
    price: 30000, // em centavos (R$ 300,00)
    description: "Para uso intensivo com 40% de desconto",
    validityDays: 90,
  },
];

// Obter planos de crédito disponíveis
exports.getCreditPlans = async (req, res) => {
  try {
    // Poderia ser implementado para buscar do banco de dados no futuro
    res.json({ plans: CREDIT_PLANS });
  } catch (error) {
    console.error("Erro ao obter planos de crédito:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Processar compra de créditos
exports.purchaseCredits = async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;
    const companyId = req.user.companyId;

    // Buscar o plano selecionado
    const selectedPlan = CREDIT_PLANS.find((plan) => plan.id === planId);
    if (!selectedPlan) {
      return res
        .status(400)
        .json({ message: "Plano de créditos não encontrado" });
    }

    // Em um ambiente real, aqui integraríamos com o gateway de pagamentos
    // Por enquanto, vamos simular um pagamento bem-sucedido

    // Processar a adição de créditos
    const result = await prisma.$transaction(async (prisma) => {
      // Buscar a empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error("Empresa não encontrada");
      }

      // Adicionar créditos
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          credits: {
            increment: selectedPlan.credits,
          },
        },
      });

      // Registrar a transação
      const transaction = await prisma.creditTransaction.create({
        data: {
          companyId,
          amount: selectedPlan.credits,
          operationType: "ADD",
          balanceAfter: updatedCompany.credits,
          description: `Compra de pacote ${selectedPlan.name}`,
          metadata: {
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            price: selectedPlan.price,
            paymentMethod,
            validUntil: new Date(
              Date.now() + selectedPlan.validityDays * 24 * 60 * 60 * 1000
            ),
          },
        },
      });

      return {
        transaction,
        updatedBalance: updatedCompany.credits,
      };
    });

    res.status(200).json({
      success: true,
      message: `Compra de ${selectedPlan.credits} créditos realizada com sucesso!`,
      transaction: result.transaction,
      newBalance: result.updatedBalance,
    });
  } catch (error) {
    console.error("Erro ao processar compra de créditos:", error);
    res
      .status(500)
      .json({ message: "Erro ao processar compra", error: error.message });
  }
};

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

// Cálculo de créditos baseado em tokens
exports.calculateCreditCost = (tokenUsage, model = "default") => {
  // Diferentes taxas para diferentes modelos de LLM
  const ratePerToken = {
    "gpt-3.5-turbo": 0.01, // 100 tokens = 1 crédito
    "gpt-4": 0.03, // 33.3 tokens = 1 crédito
    "claude-3-haiku": 0.01, // 100 tokens = 1 crédito
    "claude-3-sonnet": 0.02, // 50 tokens = 1 crédito
    "claude-3-opus": 0.04, // 25 tokens = 1 crédito
    default: 0.01, // Taxa padrão: 100 tokens = 1 crédito
  };

  const rate = ratePerToken[model] || ratePerToken.default;

  // Cálculo dos créditos com base nos tokens
  // Entrada e saída podem ter pesos diferentes
  const inputTokenCost = tokenUsage.input * rate;
  const outputTokenCost = tokenUsage.output * rate * 1.5; // Saída custa 50% mais

  const totalCost = Math.ceil(inputTokenCost + outputTokenCost);

  // Garantir que o custo mínimo seja 1 crédito
  return Math.max(1, totalCost);
};

// Consumir créditos (para uso interno, chamado por outros controladores)
exports.consumeCredits = async (companyId, tokenUsage, model, description) => {
  try {
    // Verificar se tokenUsage é válido
    if (!tokenUsage) {
      throw new Error("Uso de tokens não especificado");
    }

    // Garantir que temos um valor numérico válido para o custo
    let creditCost;

    // Se tokenUsage for um número, usamos diretamente
    if (typeof tokenUsage === "number") {
      creditCost = Math.max(1, Math.ceil(tokenUsage));
    }
    // Se for um objeto com propriedades de tokens
    else if (typeof tokenUsage === "object") {
      // Calcular com base nas propriedades
      creditCost = this.calculateCreditCost(tokenUsage, model);
    } else {
      // Valor padrão se nenhuma das opções acima funcionar
      creditCost = 1;
    }

    console.log("Consumindo créditos:", {
      companyId,
      tokenUsage,
      model,
      creditCost,
    });

    // Verificar se creditCost é um número válido
    if (isNaN(creditCost) || creditCost <= 0) {
      creditCost = 1; // Usar valor padrão se inválido
    }

    // Iniciar transação para garantir consistência
    const result = await prisma.$transaction(async (prisma) => {
      // Verificar saldo atual
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error(`Empresa não encontrada: ${companyId}`);
      }

      if (company.credits < creditCost) {
        throw new Error(
          `Créditos insuficientes. Necessário: ${creditCost}, Disponível: ${company.credits}`
        );
      }

      // Atualizar saldo com valor explícito
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          credits: company.credits - creditCost, // Usar substração direta em vez de decrement
        },
      });

      // Registrar transação com detalhes de consumo
      await prisma.creditTransaction.create({
        data: {
          companyId,
          amount: creditCost,
          operationType: "SUBTRACT",
          balanceAfter: updatedCompany.credits,
          description: description || "Consumo de créditos",
          metadata: {
            tokenUsage,
            model,
            creditCost,
          },
        },
      });

      return {
        updatedCompany,
        creditCost,
      };
    });

    return result;
  } catch (error) {
    console.error("Erro ao consumir créditos:", error);
    throw error;
  }
};
