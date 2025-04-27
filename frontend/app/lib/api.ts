// frontend/lib/api.ts

import axios from "axios";

// Definir a URL base da API
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://seu-backend-url.onrender.com"
    : "http://localhost:3000");
// Criar instância do axios
const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptador para adicionar token de autenticação
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Interceptador para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Verificar se é um erro 401 (não autorizado)
    if (
      error.response &&
      error.response.status === 401 &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirecionamento para login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
