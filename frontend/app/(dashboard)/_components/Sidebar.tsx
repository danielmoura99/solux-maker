// app/(dashboard)/_components/Sidebar.tsx

"use client";

import Link from "next/link";

import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  CreditCard,
  Settings,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";

type SidebarProps = {
  pathname: string;
};

type SidebarItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
};

export default function Sidebar({ pathname }: SidebarProps) {
  const { user } = useAuth();

  const isActive = (path: string) => pathname === path;

  const menuItems: SidebarItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: "Documentos",
      href: "/documents",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: "Conversas",
      href: "/conversations",
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      name: "Créditos",
      href: "/credits",
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      name: "Configurações",
      href: "/settings",
      icon: <Settings className="w-5 h-5" />,
    },
    {
      name: "Usuários",
      href: "/users",
      icon: <Users className="w-5 h-5" />,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      name: "Admin",
      href: "/admin",
      icon: <ShieldCheck className="w-5 h-5" />,
      roles: ["SUPER_ADMIN"],
    },
  ];

  // Filtrar itens de menu baseado no papel do usuário
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || "");
  });

  return (
    <nav className="bg-blue-700 text-white flex flex-col h-full">
      <div className="flex items-center justify-center h-16 border-b border-blue-600">
        <span className="font-bold text-xl">Solux</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-none
                  ${
                    isActive(item.href)
                      ? "bg-blue-800 text-white"
                      : "text-white hover:bg-blue-600"
                  }
                `}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-blue-600">
        <div className="text-sm text-blue-200">
          <p className="font-medium">{user?.name}</p>
          <p className="text-xs">{user?.email}</p>
        </div>
      </div>
    </nav>
  );
}
