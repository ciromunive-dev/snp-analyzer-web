# SNP Analyzer Web

Aplicacion web para analisis de variantes geneticas (SNPs) en ADN humano. Permite subir secuencias FASTA, alinear con BLAST y obtener anotaciones clinicas.

## Stack Tecnologico

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **API**: tRPC 11, NextAuth 5
- **Database**: PostgreSQL (Supabase)
- **Queue**: Redis (Upstash)
- **ORM**: Prisma 6

## Caracteristicas

- Subida de secuencias en formato FASTA
- Alineamiento contra genoma humano (GRCh38) con BLAST
- Deteccion automatica de SNPs
- Anotacion clinica (ClinVar, gnomAD, VEP)
- Exportacion a PDF, CSV y VCF
- Autenticacion con Google y GitHub

## Configuracion

### Variables de Entorno

Configura las siguientes variables en Vercel:

```env
# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
AUTH_SECRET="genera-con-openssl-rand-base64-32"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

### Deploy en Vercel

1. Conecta el repositorio a Vercel
2. Configura las variables de entorno
3. Deploy automatico

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma db push

# Iniciar servidor de desarrollo
npm run dev
```

## Estructura del Proyecto

```
src/
├── app/                    # App Router (Next.js 16)
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Dashboard protegido
│   └── api/               # API routes
├── components/            # Componentes React
│   ├── sequence-input.tsx
│   ├── variant-table.tsx
│   └── export-panel.tsx
├── server/
│   ├── api/routers/       # tRPC routers
│   └── auth/              # NextAuth config
└── lib/                   # Utilidades
```

## License

MIT
