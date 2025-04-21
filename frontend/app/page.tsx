// app/page.tsx

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center max-w-3xl px-4">
        <h1 className="text-4xl font-bold mb-6">
          Solux - Plataforma de Atendimento com IA
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Automatize o atendimento ao cliente com inteligência artificial e
          transforme a experiência dos seus clientes.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </div>
  );
}
