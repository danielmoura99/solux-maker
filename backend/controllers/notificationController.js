// backend/controllers/notificationController.js

const prisma = require("../lib/prisma");

// Obter notificações
exports.getNotifications = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { limit = 10, status } = req.query;

    const whereClause = { companyId };
    if (status) {
      whereClause.status = status;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit),
    });

    // Contar notificações não lidas
    const unreadCount = await prisma.notification.count({
      where: {
        companyId,
        status: "UNREAD",
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Marcar notificação como lida
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Verificar se a notificação existe e pertence à empresa
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada" });
    }

    // Atualizar o status da notificação
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });

    res.json(updatedNotification);
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Marcar todas as notificações como lidas
exports.markAllAsRead = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Atualizar todas as notificações não lidas da empresa
    await prisma.notification.updateMany({
      where: {
        companyId,
        status: "UNREAD",
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Todas as notificações marcadas como lidas",
    });
  } catch (error) {
    console.error("Erro ao marcar todas notificações como lidas:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
