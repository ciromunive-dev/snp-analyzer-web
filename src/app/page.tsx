import Link from "next/link";
import { auth } from "~/server/auth";
import {
  DNAIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  UploadIcon,
  SearchIcon,
  ClipboardIcon,
  ChartIcon,
  DownloadIcon,
} from "~/components/icons";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background-light">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al contenido principal
      </a>

      {/* Navigation */}
      <nav
        className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-sm"
        aria-label="Navegacion principal"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg">
            <DNAIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold">SNP Analyzer</span>
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-primary px-4 py-2 font-semibold transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                  Dashboard
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="rounded-lg border border-white/20 px-4 py-2 font-semibold transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                  Cerrar sesion
                </Link>
              </>
            ) : (
              <Link
                href="/api/auth/signin"
                className="rounded-lg bg-primary px-4 py-2 font-semibold transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                Iniciar sesion
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="main-content"
        className="flex min-h-screen flex-col items-center justify-center px-4 pt-20"
        aria-labelledby="hero-title"
      >
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary-light">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" aria-hidden="true" />
            <span>Analisis genetico en la nube</span>
          </div>

          <h1 id="hero-title" className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              SNP Analyzer
            </span>
          </h1>

          <p className="mb-8 text-xl text-gray-300 sm:text-2xl">
            Analiza variantes geneticas en tu ADN de forma rapida y sencilla.
            Detecta SNPs, alinea con BLAST y obtiene anotaciones clinicas.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={session ? "/dashboard" : "/api/auth/signin"}
              className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-semibold transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {session ? "Ir al Dashboard" : "Comenzar ahora"}
              <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className="rounded-lg border border-white/20 px-8 py-4 text-lg font-semibold transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Conocer mas
            </Link>
          </div>

          {session && (
            <p className="mt-6 text-gray-300">
              Bienvenido, <span className="text-white font-medium">{session.user.name}</span>
            </p>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <a
            href="#features"
            className="block animate-bounce text-gray-500 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-2"
            aria-label="Ver caracteristicas"
          >
            <ChevronDownIcon className="h-8 w-8" />
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24" aria-labelledby="features-title">
        <div className="mx-auto max-w-7xl px-4">
          <h2 id="features-title" className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            Caracteristicas principales
          </h2>
          <p className="mb-16 text-center text-gray-300">
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
      <section className="border-y border-white/10 bg-background-light py-16" aria-labelledby="stats-title">
        <h2 id="stats-title" className="sr-only">Estadisticas del servicio</h2>
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 sm:grid-cols-3">
            <StatCard value="53%" label="de variantes son VUS" />
            <StatCard value="100K" label="caracteres max por secuencia" />
            <StatCard value="Gratis" label="tier disponible" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24" aria-labelledby="cta-title">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 id="cta-title" className="mb-4 text-3xl font-bold sm:text-4xl">
            Listo para analizar tu ADN?
          </h2>
          <p className="mb-8 text-gray-300">
            Crea una cuenta gratuita y comienza a detectar variantes geneticas en minutos.
          </p>
          <Link
            href={session ? "/dashboard" : "/api/auth/signin"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-semibold transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            {session ? "Ir al Dashboard" : "Crear cuenta gratis"}
            <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8" role="contentinfo">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <DNAIcon className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="font-semibold">SNP Analyzer</span>
            </div>
            <p className="text-sm text-gray-400">
              {new Date().getFullYear()} SNP Analyzer. Proyecto de bioinformatica.
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
    <article className="rounded-xl border border-white/10 bg-surface p-6 transition hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </article>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-bold text-primary">{value}</p>
      <p className="text-gray-300">{label}</p>
    </div>
  );
}
