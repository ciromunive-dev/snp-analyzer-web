import Link from "next/link";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background-light">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <DNAIcon className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SNP Analyzer</span>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-primary px-4 py-2 font-semibold transition hover:bg-primary-light"
                >
                  Dashboard
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="rounded-lg border border-white/20 px-4 py-2 font-semibold transition hover:bg-white/10"
                >
                  Cerrar sesion
                </Link>
              </>
            ) : (
              <Link
                href="/api/auth/signin"
                className="rounded-lg bg-primary px-4 py-2 font-semibold transition hover:bg-primary-light"
              >
                Iniciar sesion
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary-light">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            Analisis genetico en la nube
          </div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              SNP Analyzer
            </span>
          </h1>

          <p className="mb-8 text-xl text-gray-400 sm:text-2xl">
            Analiza variantes geneticas en tu ADN de forma rapida y sencilla.
            Detecta SNPs, alinea con BLAST y obtiene anotaciones clinicas.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={session ? "/dashboard" : "/api/auth/signin"}
              className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-semibold transition hover:bg-primary-light"
            >
              {session ? "Ir al Dashboard" : "Comenzar ahora"}
              <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="rounded-lg border border-white/20 px-8 py-4 text-lg font-semibold transition hover:bg-white/10"
            >
              Conocer mas
            </Link>
          </div>

          {session && (
            <p className="mt-6 text-gray-400">
              Bienvenido, <span className="text-white">{session.user.name}</span>
            </p>
          )}
        </div>

        {/* DNA Animation */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="animate-bounce text-gray-500">
            <ChevronDownIcon className="h-8 w-8" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            Caracteristicas principales
          </h2>
          <p className="mb-16 text-center text-gray-400">
            Todo lo que necesitas para analizar variantes geneticas
          </p>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<UploadIcon className="h-8 w-8" />}
              title="Sube secuencias FASTA"
              description="Arrastra y suelta archivos FASTA o pega directamente tu secuencia de ADN para analizar."
            />
            <FeatureCard
              icon={<SearchIcon className="h-8 w-8" />}
              title="Alineamiento BLAST"
              description="Alinea tu secuencia contra el genoma humano de referencia GRCh38 usando NCBI BLAST."
            />
            <FeatureCard
              icon={<DNAIcon className="h-8 w-8" />}
              title="Deteccion de SNPs"
              description="Identifica automaticamente variantes geneticas comparando con la secuencia de referencia."
            />
            <FeatureCard
              icon={<ClipboardIcon className="h-8 w-8" />}
              title="Anotacion clinica"
              description="Obtiene informacion de ClinVar, gnomAD y VEP sobre la significancia clinica de cada variante."
            />
            <FeatureCard
              icon={<ChartIcon className="h-8 w-8" />}
              title="Visualizacion"
              description="Explora tus resultados con tablas interactivas, filtros y graficos de resumen."
            />
            <FeatureCard
              icon={<DownloadIcon className="h-8 w-8" />}
              title="Exporta reportes"
              description="Descarga tus resultados en formato PDF, CSV o VCF para compartir o analizar."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-white/10 bg-background-light py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 sm:grid-cols-3">
            <StatCard value="53%" label="de variantes son VUS" />
            <StatCard value="100K" label="caracteres max por secuencia" />
            <StatCard value="Gratis" label="tier disponible" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Listo para analizar tu ADN?
          </h2>
          <p className="mb-8 text-gray-400">
            Crea una cuenta gratuita y comienza a detectar variantes geneticas en minutos.
          </p>
          <Link
            href={session ? "/dashboard" : "/api/auth/signin"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-semibold transition hover:bg-primary-light"
          >
            {session ? "Ir al Dashboard" : "Crear cuenta gratis"}
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <DNAIcon className="h-6 w-6 text-primary" />
              <span className="font-semibold">SNP Analyzer</span>
            </div>
            <p className="text-sm text-gray-500">
              2024 SNP Analyzer. Proyecto de bioinformatica.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Components
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-6 transition hover:border-primary/50">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-bold text-primary">{value}</p>
      <p className="text-gray-400">{label}</p>
    </div>
  );
}

// Icons
function DNAIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
