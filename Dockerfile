FROM node:18

# Instalar Python e dependências
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    # Dependências para Chrome headless/Puppeteer
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libasound2 \
    libpango-1.0-0

# Definir diretório de trabalho
WORKDIR /app

# Copiar e instalar dependencies do Node
COPY package*.json ./
RUN npm install

# Copiar e instalar dependencies do Python
COPY python_service/requirements.txt ./python_service/
RUN pip3 install -r python_service/requirements.txt

# Copiar aplicação
COPY . .

# Build do Prisma
RUN npx prisma generate

# Expor portas
EXPOSE 3000 5000

# Script de inicialização
CMD ["node", "backend/server.js"]