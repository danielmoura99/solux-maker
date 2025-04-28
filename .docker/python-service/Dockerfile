# Usar uma imagem base mais leve
FROM python:3.10-slim

WORKDIR /app

# Instalar apenas as dependências necessárias, evitar pacotes dev
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar apenas os requisitos primeiro para aproveitar o cache do Docker
COPY python_service/requirements.txt .

# Instalar dependências com flags para reduzir tamanho
RUN pip install --no-cache-dir -r requirements.txt

# Criar diretórios necessários (importante para docling)
RUN mkdir -p uploads processed && chmod 777 uploads processed

# Copiar apenas o código da aplicação
COPY python_service/*.py ./
COPY python_service/app.py ./

EXPOSE 5000

CMD ["python", "app.py"]