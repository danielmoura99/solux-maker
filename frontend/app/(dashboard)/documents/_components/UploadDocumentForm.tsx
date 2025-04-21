// app/(dashboard)/documents/_components/UploadDocumentForm.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import api from "@/app/lib/api";

export default function UploadDocumentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("PDF");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Se o nome não foi definido pelo usuário, usar o nome do arquivo
      if (!name) {
        // Remover a extensão
        const fileName = selectedFile.name.split(".").slice(0, -1).join(".");
        setName(fileName);
      }

      // Tentar detectar o tipo
      const extension = selectedFile.name.split(".").pop()?.toUpperCase();
      if (extension === "PDF" || extension === "DOCX" || extension === "TXT") {
        setType(extension);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Por favor, selecione um arquivo");
      return;
    }

    try {
      setLoading(true);

      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append("name", name);
      formData.append("type", type);
      formData.append("file", file);

      // Configurar cabeçalhos específicos para upload de arquivo
      const response = await api.post("api/documents", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Documento enviado com sucesso! Processamento iniciado.");
      setOpen(false);
      router.refresh();

      // Limpar o formulário
      setName("");
      setFile(null);

      // Recarregar a página após 2 segundos para atualizar a lista
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      toast.error("Erro ao enviar documento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" /> Adicionar Documento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Documento</DialogTitle>
          <DialogDescription>
            Envie um documento para ser processado pelo assistente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Documento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Manual do Produto"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo do Documento</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="DOCX">DOCX</SelectItem>
                <SelectItem value="TXT">TXT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              required
            />
            <p className="text-sm text-gray-500">
              Formatos suportados: PDF, DOCX, TXT. Tamanho máximo: 10MB.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Documento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
