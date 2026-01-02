# SNP Bioinfo Service

Microservicio de procesamiento bioinformático para SNP Analyzer.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      SNP Bioinfo Service                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Worker     │───▶│ BLAST Service│───▶│  Annotator   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                    │           │
│         │                   ▼                    ▼           │
│         │           ┌──────────────┐    ┌──────────────┐    │
│         │           │   Variant    │    │    NCBI      │    │
│         │           │   Detector   │    │   Ensembl    │    │
│         │           └──────────────┘    └──────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │  Supabase    │                                           │
│  │  (Postgres)  │                                           │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Procesamiento

1. **Worker** consume jobs de la cola Redis
2. **BLAST Service** alinea la secuencia contra el genoma humano (GRCh38)
3. **Variant Detector** identifica SNPs, inserciones y deleciones
4. **Annotator** enriquece con información de:
   - dbSNP (rsID)
   - ClinVar (significancia clínica)
   - Ensembl VEP (consecuencia, predicciones)
5. Resultados se guardan en Supabase

## Requisitos

- Python 3.11+
- Docker (opcional, para desarrollo local)

## Instalación

### Desarrollo Local

```bash
# Clonar repositorio
cd snp-bioinfo-service

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### Con Docker

```bash
# Desarrollo con Redis local
docker-compose up -d

# Solo el worker (producción)
docker build -t snp-bioinfo-service .
docker run --env-file .env snp-bioinfo-service
```

## Configuración

Variables de entorno requeridas:

| Variable | Descripción |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | URL de Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash Redis |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (NO anon key) |
| `NCBI_EMAIL` | Email para APIs de NCBI |
| `NCBI_API_KEY` | (Opcional) API key de NCBI |

## Ejecución

### Worker (procesamiento de jobs)

```bash
python -m app.worker
```

### API (health checks)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Tests

```bash
pytest
```

## Deploy en Railway

1. Conectar repositorio a Railway
2. Configurar variables de entorno
3. El deploy automático usa `railway.toml`

## API Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /` | Info del servicio |
| `GET /health` | Health check |
| `GET /ready` | Readiness check |

## Licencia

MIT
