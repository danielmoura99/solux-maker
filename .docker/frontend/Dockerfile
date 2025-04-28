# Imagem base Node.js
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY frontend/package*.json ./

# Instalar dependências
RUN npm install

# Copiar o código do projeto
COPY frontend/ ./

# Construir a aplicação para produção
RUN npm run build

# Porta que será exposta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "run", "dev"]