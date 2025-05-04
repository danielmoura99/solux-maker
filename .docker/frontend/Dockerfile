# Imagem base Node.js
FROM node:18-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY frontend/package*.json ./

# Instalar dependências
RUN npm install

# Copiar o código do projeto
COPY frontend/ ./

# Variáveis de ambiente
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Construir a aplicação para produção
RUN npm run build

# Imagem de produção
FROM node:18-alpine

WORKDIR /app

# Copiar da imagem de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules


# Porta que será exposta
EXPOSE 3000

# Comando para iniciar a aplicação
#CMD ["npm", "run", "dev", "start"]

# Comando para iniciar a aplicação
CMD ["npm", "start"]