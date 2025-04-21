// backend/server.js

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
require("dotenv").config();
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);

// Importar rotas
const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/company");
const documentRoutes = require("./routes/document");
const conversationRoutes = require("./routes/conversation");
const creditRoutes = require("./routes/credit");
const assistantRoutes = require("./routes/assistant");

// Inicializar appaa
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Rotas - Adicionando prefixo /api
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/assistant", assistantRoutes);

// Rota básica
app.get("/", (req, res) => {
  res.json({
    message: "Bem-vindo à API da Solux - Plataforma de Atendimento com IA",
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erro interno do servidor" });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
