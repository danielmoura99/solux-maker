// app/(dashboard)/test-assistant/rag/page.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/app/lib/api";
import { toast } from "sonner";

type Source = {
  id: string;
  documentId: string;
  documentName: string;
  similarity: number;
  snippet: string;
};

export default function TestRAGPage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || loading) return;

    try {
      setLoading(true);
      setResponse("");
      setSources([]);
      setMetadata(null);

      const result = await api.post("api/assistant/test-rag", { query });

      setResponse(result.data.answer);
      setSources(result.data.sources || []);
      setMetadata(result.data.metadata);

      toast.success("Teste RAG concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao testar RAG:", error);
      toast.error("Erro ao testar RAG. Verifique o console para detalhes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Teste do Sistema RAG</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="query" className="font-medium">
                Digite uma pergunta para testar o sistema RAG:
              </label>
              <div className="flex gap-2">
                <Input
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: Qual a decisão sobre LLMs?"
                  className="flex-grow"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? "Processando..." : "Testar"}
                </Button>
              </div>
            </div>
          </form>

          {loading && (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          )}

          {response && (
            <div className="mt-8">
              <h3 className="font-medium text-lg mb-2">Resposta:</h3>
              <div className="bg-gray-50 p-4 rounded-md border whitespace-pre-wrap">
                {response}
              </div>

              {sources.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-lg mb-2">Fontes:</h3>
                  <div className="space-y-2">
                    {sources.map((source, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-4 rounded-md border"
                      >
                        <p className="font-medium">{source.documentName}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Relevância: {(source.similarity * 100).toFixed(2)}%
                        </p>
                        {source.snippet && (
                          <p className="mt-2 text-sm border-l-2 border-blue-300 pl-2">
                            {source.snippet}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metadata && (
                <div className="mt-4">
                  <h3 className="font-medium text-lg mb-2">Metadados:</h3>
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Tokens de entrada:</span>{" "}
                        {metadata.tokenUsage?.input}
                      </div>
                      <div>
                        <span className="font-medium">Tokens de saída:</span>{" "}
                        {metadata.tokenUsage?.output}
                      </div>
                      <div>
                        <span className="font-medium">Total de tokens:</span>{" "}
                        {metadata.tokenUsage?.total}
                      </div>
                      <div>
                        <span className="font-medium">Custo (créditos):</span>{" "}
                        {metadata.creditCost}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
