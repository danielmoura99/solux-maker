/* eslint-disable @typescript-eslint/no-explicit-any */
// contexts/AuthContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/app/lib/api";

// Definir tipos
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

type RegisterData = {
  name: string;
  email: string;
  password: string;
  companyName: string;
};

// Criar contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Verificar se o usuário já está autenticado ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Configurar o token no cabeçalho das requisições
          api.defaults.headers.common["Authorization"] =
            `Bearer ${storedToken}`;

          // Opcional: Verificar se o token ainda é válido fazendo uma chamada API
          // await api.get('/auth/profile');
        } catch (error) {
          console.error("Erro ao verificar autenticação:", error);
          // Se o token for inválido, limpar o armazenamento
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await api.post("api/auth/login", { email, password });

      const { token: newToken, user: userData } = response.data;

      // Salvar no estado
      setToken(newToken);
      setUser(userData);

      // Salvar no localStorage
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(userData));

      // Configurar o token no cabeçalho das requisições
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

      // Mostrar mensagem de sucesso
      toast.success("Login realizado com sucesso!");

      // Redirecionar para o dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);

      // Mostrar mensagem de erro
      toast.error(error.response?.data?.message || "Erro ao fazer login");

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);

      // Primeiro criar a empresa
      const companyResponse = await api.post("api/companies", {
        name: data.companyName,
        email: data.email,
      });

      const companyId = companyResponse.data.id;

      // Depois criar o usuário
      await api.post("api/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
        companyId,
      });

      // Mostrar mensagem de sucesso
      toast.success(
        "Registro realizado com sucesso! Faça login para continuar."
      );

      // Redirecionar para o login
      router.push("/login");
    } catch (error: any) {
      console.error("Erro ao registrar:", error);

      // Mostrar mensagem de erro
      toast.error(error.response?.data?.message || "Erro ao criar conta");

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Limpar estado
    setToken(null);
    setUser(null);

    // Limpar localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Remover token dos cabeçalhos
    delete api.defaults.headers.common["Authorization"];

    // Mostrar mensagem
    toast.success("Você saiu do sistema.");

    // Redirecionar para login
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
