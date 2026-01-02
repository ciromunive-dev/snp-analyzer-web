# syntax=docker/dockerfile:1

FROM python:3.12-slim AS builder

WORKDIR /app

# Instalar dependencias del sistema para compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


FROM python:3.12-slim AS runtime

WORKDIR /app

# Instalar BLAST+ (necesario para Biopython BLAST local)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ncbi-blast+ \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copiar código de la aplicación
COPY app/ ./app/

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Exponer puerto para health check
EXPOSE 8000

# Comando por defecto: ejecutar worker
CMD ["python", "-m", "app.worker"]
