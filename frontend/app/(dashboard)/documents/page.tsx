// app/(dashboard)/documents/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText, Loader2 } from "lucide-react";
import { DataTable } from "./_components/DataTable";
import { columns } from "./_columns/columns";
import UploadDocumentForm from "./_components/UploadDocumentForm";

type Document = {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await api.get("api/documents");
        setDocuments(response.data || []);
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchDocuments();
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <UploadDocumentForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total de Documentos</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Processados</p>
                <p className="text-2xl font-bold">
                  {documents.filter((doc) => doc.status === "PROCESSED").length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Em Processamento</p>
                <p className="text-2xl font-bold">
                  {
                    documents.filter((doc) => doc.status === "PROCESSING")
                      .length
                  }
                </p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50">
                <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <DataTable columns={columns} data={documents} />
        </div>
      )}
    </div>
  );
}
