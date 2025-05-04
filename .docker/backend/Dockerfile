FROM node:18-alpine

WORKDIR /

RUN npm install -g nodemon

# Copiar o package.json da raiz do projeto
COPY package*.json ./

# Instalar dependências
RUN npm install

# Instalar dependências de produção
RUN npm ci --only=production

# Copiar o código do projeto
COPY backend/ ./backend/
COPY prisma/ ./prisma/

# Gerar cliente Prisma
RUN npx prisma generate

EXPOSE 3000

# Ajustar comando para iniciar a partir da raiz
# CMD ["npm", "run", "dev"]

# Iniciar a aplicação
CMD ["node", "backend/server.js"]