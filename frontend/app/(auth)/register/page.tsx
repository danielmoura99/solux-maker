/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(auth)/register/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/contexts/AuthContext";
import RegisterForm from "./_components/RegisterForm";

type RegisterData = {
  name: string;
  email: string;
  password: string;
  companyName: string;
};

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError("");

      await register(data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao registrar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">Criar Conta</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <RegisterForm onSubmit={handleRegister} loading={loading} />
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Faça login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
