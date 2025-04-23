// backend/services/notificationService.js

const prisma = require("../lib/prisma");

class NotificationService {
  constructor() {
    // Configurações de limites para alertas
    this.creditThresholds = {
      low: 50, // Alerta de saldo baixo
      critical: 10, // Alerta crítico
    };
  }

  // Verificar se o saldo está baixo e enviar notificação se necessário
  async checkLowBalanceAndNotify(companyId) {
    try {
      // Buscar empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          users: {
            where: { role: "ADMIN" }, // Buscar apenas administradores
            select: { email: true, name: true },
          },
        },
      });

      if (!company) {
        console.error(`Empresa não encontrada: ${companyId}`);
        return false;
      }

      // Verificar o saldo atual e se já enviamos um alerta recentemente
      const lastNotification = await prisma.notification.findFirst({
        where: {
          companyId,
          type: "LOW_BALANCE",
          createdAt: {
            // Verificar se já enviamos um alerta nas últimas 24 horas
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Se já enviamos recentemente, não enviar novamente
      if (lastNotification) {
        console.log(
          `Alerta de saldo baixo já enviado recentemente para empresa ${companyId}`
        );
        return false;
      }

      // Determinar o nível de alerta baseado no saldo
      let alertLevel = null;
      if (company.credits <= this.creditThresholds.critical) {
        alertLevel = "CRITICAL";
      } else if (company.credits <= this.creditThresholds.low) {
        alertLevel = "LOW";
      }

      // Se não há necessidade de alerta, retornar
      if (!alertLevel) {
        return false;
      }

      // Criar notificação no banco de dados
      const notification = await prisma.notification.create({
        data: {
          companyId,
          type: "LOW_BALANCE",
          title:
            alertLevel === "CRITICAL"
              ? "Saldo crítico de créditos"
              : "Saldo baixo de créditos",
          message:
            alertLevel === "CRITICAL"
              ? `Seu saldo de créditos está extremamente baixo (${company.credits} créditos). Adicione mais créditos imediatamente para evitar interrupção do serviço.`
              : `Seu saldo de créditos está baixo (${company.credits} créditos). Considere adicionar mais créditos em breve.`,
          metadata: {
            credits: company.credits,
            alertLevel,
          },
          status: "UNREAD",
        },
      });

      // Em uma implementação real, aqui enviaríamos email também
      // await this._sendEmailNotification(company.users, notification);

      console.log(
        `Alerta de saldo ${alertLevel} enviado para empresa ${companyId}`
      );
      return true;
    } catch (error) {
      console.error(`Erro ao verificar saldo e enviar notificação: ${error}`);
      return false;
    }
  }

  // Método para enviar email (simulado para o MVP)
  async _sendEmailNotification(users, notification) {
    // Apenas simulação para o MVP - Em produção integraríamos com serviço de email
    console.log(
      `[SIMULAÇÃO] Enviando email de notificação para ${users.length} usuários:`
    );
    console.log(`Assunto: ${notification.title}`);
    console.log(`Mensagem: ${notification.message}`);
    return true;
  }
}

module.exports = NotificationService;
