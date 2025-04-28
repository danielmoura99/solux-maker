// backend/server.js (modificar para adicionar multer)

const { spawn } = require("child_process");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const healthzRouter = require("./healthz");

require("dotenv").config();

// Configurar o multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Criar pasta para a empresa se não existir
    const dir = path.join(__dirname, "uploads", req.user?.companyId || "temp");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Usar o nome original para facilitar a identificação
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Inicializar app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/healthz", healthzRouter);

// Configurar timeout longo para SSE (Server-Sent Events)
app.use((req, res, next) => {
  if (req.url.includes("/api/whatsapp/events")) {
    req.socket.setTimeout(0);
    res.socket.setTimeout(0);
  }
  next();
});

// Importar rotas
const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/company");
const documentRoutes = require("./routes/document");
const conversationRoutes = require("./routes/conversation");
const creditRoutes = require("./routes/credit");
const assistantRoutes = require("./routes/assistant");
const notificationRoutes = require("./routes/notification");
const whatsappRoutes = require("./routes/whatsapp");

// Middleware para upload de documentos
app.use("/api/documents", (req, res, next) => {
  if (req.method === "POST") {
    // Verificar token antes do upload
    const auth = require("./middlewares/auth");
    auth(req, res, () => {
      upload.single("file")(req, res, next);
    });
  } else {
    next();
  }
});

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/whatsapp", whatsappRoutes);

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
