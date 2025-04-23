// frontend/app/(dashboard)/_components/NotificationDropdown.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
};

export default function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Função para buscar notificações
  const fetchNotifications = async () => {
    try {
      // Em uma implementação real, buscaríamos da API:
      // const response = await api.get("api/notifications");
      // setNotifications(response.data.notifications || []);

      // Simulação para o MVP:
      const mockNotifications = [
        {
          id: "1",
          type: "LOW_BALANCE",
          title: "Saldo de créditos baixo",
          message:
            "Seu saldo de créditos está baixo. Considere adicionar mais créditos em breve.",
          status: "UNREAD",
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          type: "SYSTEM_UPDATE",
          title: "Atualização do sistema",
          message: "Uma nova atualização será aplicada hoje às 22h.",
          status: "READ",
          createdAt: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ];

      setNotifications(mockNotifications);
      setUnreadCount(
        mockNotifications.filter((n) => n.status === "UNREAD").length
      );
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para marcar como lida
  const markAsRead = async (id: string) => {
    try {
      // Em uma implementação real, chamaríamos a API:
      // await api.put(`api/notifications/${id}/read`);

      // Simulação para o MVP:
      setNotifications(
        notifications.map((notification) =>
          notification.id === id
            ? { ...notification, status: "READ" }
            : notification
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Função para marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      // Em uma implementação real, chamaríamos a API:
      // await api.put(`api/notifications/read-all`);

      // Simulação para o MVP:
      setNotifications(
        notifications.map((notification) => ({
          ...notification,
          status: "READ",
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar todas notificações como lidas:", error);
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchNotifications();

      // Atualizar periodicamente (a cada 5 minutos)
      const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6"
              onClick={markAllAsRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="py-2 px-2 text-center">
            <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full mx-auto"></div>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`p-0 focus:bg-transparent hover:bg-transparent cursor-default`}
            >
              <div
                className={`w-full p-2 ${notification.status === "UNREAD" ? "bg-blue-50" : ""}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-sm">
                    {notification.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(
                      new Date(notification.createdAt),
                      "dd/MM/yy HH:mm",
                      { locale: ptBR }
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-700 mb-1">
                  {notification.message}
                </p>
                {notification.status === "UNREAD" && (
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 py-0"
                    >
                      Marcar como lida
                    </Button>
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="py-4 text-center text-gray-500 text-sm">
            Sem notificações no momento.
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={fetchNotifications}
          >
            Atualizar
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
