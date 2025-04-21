// app/(dashboard)/documents/_columns/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, FileText, FileArchive, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tipos
export type Document = {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// Função para renderizar ícone baseado no tipo de documento
const getDocumentIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "pdf":
      return <FileArchive className="h-5 w-5 text-red-500" />;
    case "docx":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "txt":
      return <FileCode className="h-5 w-5 text-gray-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

// Definição das colunas
export const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <div className="flex items-center">
          {getDocumentIcon(type)}
          <span className="ml-2 uppercase text-xs">{type}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;

      let statusText = status;
      let statusClass = "";

      switch (status) {
        case "PROCESSING":
          statusText = "Processando";
          statusClass = "bg-yellow-100 text-yellow-800";
          break;
        case "PROCESSED":
          statusText = "Processado";
          statusClass = "bg-green-100 text-green-800";
          break;
        case "ERROR":
          statusText = "Erro";
          statusClass = "bg-red-100 text-red-800";
          break;
        default:
          statusClass = "bg-gray-100 text-gray-800";
      }

      return (
        <div
          className={`rounded-full px-2 py-1 text-xs inline-block ${statusClass}`}
        >
          {statusText}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Data de Upload",
    cell: ({ row }) => {
      const createdAt = new Date(row.getValue("createdAt"));
      return format(createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR });
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const document = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(document.id)}
            >
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Visualizar</DropdownMenuItem>
            <DropdownMenuItem>Renomear</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
