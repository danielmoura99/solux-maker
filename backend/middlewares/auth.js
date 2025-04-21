// backend/middlewares/auth.js

const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

module.exports = async (req, res, next) => {
  try {
    // Verificar se o token está presente no header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Acesso negado. Token não fornecido." });
    }

    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar o usuário com o ID do token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    // Adicionar o usuário ao objeto de requisição
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
};
