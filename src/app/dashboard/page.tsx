import Link from "next/link";
import { auth } from "~/server/auth";
import { Sidebar } from "~/components/ui/sidebar";
import {
  DNAIcon,
  PlusIcon,
  ClockIcon,
  ChartIcon,
  CheckIcon,
  ArrowRightIcon,
} from "~/components/icons";

export default async function DashboardPage() {
  const session = await auth();

  // Demo mode: use placeholder stats
  const stats = {
    totalAnalyses: 0,
    processingAnalyses: 0,
    completedAnalyses: 0,
    totalVariants: 0,
  };
  const recentAnalyses: Array<{
    id: string;
    sequenceName: string;
    status: string;
    createdAt: Date;
    variantCount: number;
  }> = [];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session.user} />

      {/* Main Content */}
      <main className="min-h-screen p-4 pt-16 md:ml-64 md:p-8 md:pt-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-text-light">
            Bienvenido de vuelta, {session.user.name}
          </p>
        </header>

        {/* Quick Stats */}
        <section aria-labelledby="stats-heading" className="mb-8">
          <h2 id="stats-heading" className="sr-only">Estadisticas rapidas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Analisis Totales"
              value={stats.totalAnalyses.toString()}
              icon={<DNAIcon className="h-6 w-6" />}
              color="text-primary"
            />
            <StatCard
              title="En Progreso"
              value={stats.processingAnalyses.toString()}
              icon={<ClockIcon className="h-6 w-6" />}
              color="text-yellow-400"
            />
            <StatCard
              title="Completados"
              value={stats.completedAnalyses.toString()}
              icon={<CheckIcon className="h-6 w-6" />}
              color="text-green-400"
            />
            <StatCard
              title="Variantes Detectadas"
              value={stats.totalVariants.toString()}
              icon={<ChartIcon className="h-6 w-6" />}
              color="text-accent"
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-labelledby="actions-heading" className="mb-8">
          <h2 id="actions-heading" className="mb-4 text-xl font-semibold text-text">Acciones rapidas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href="/dashboard/new"
              title="Nuevo Analisis"
              description="Sube una secuencia FASTA para analizar variantes geneticas"
              icon={<PlusIcon className="h-8 w-8" />}
            />
            <ActionCard
              href="/dashboard/history"
              title="Ver Historial"
              description="Revisa tus analisis anteriores y descarga reportes"
              icon={<ClockIcon className="h-8 w-8" />}
            />
            <ActionCard
              href="/dashboard/stats"
              title="Estadisticas"
              description="Visualiza estadisticas de todas tus variantes"
              icon={<ChartIcon className="h-8 w-8" />}
            />
          </div>
        </section>

        {/* Recent Analyses */}
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="mb-4 text-xl font-semibold text-text">Analisis recientes</h2>
          {recentAnalyses.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {recentAnalyses.slice(0, 5).map((analysis: typeof recentAnalyses[number]) => (
                <RecentAnalysisCard key={analysis.id} analysis={analysis} />
              ))}
              {recentAnalyses.length > 5 && (
                <Link
                  href="/dashboard/history"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 text-text-light transition hover:bg-surface-light hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Ver todos los analisis
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Components
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-text-light">{title}</span>
        <span className={color} aria-hidden="true">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-text">{value}</p>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div
        className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition group-hover:bg-primary group-hover:text-white"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-text">{title}</h3>
      <p className="text-sm text-text-light">{description}</p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
      <DNAIcon className="mx-auto mb-4 h-12 w-12 text-text-lighter" aria-hidden="true" />
      <p className="mb-2 text-lg font-medium text-text">No hay analisis aun</p>
      <p className="mb-4 text-text-light">
        Comienza subiendo tu primera secuencia FASTA
      </p>
      <Link
        href="/dashboard/new"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
      >
        <PlusIcon className="h-5 w-5" aria-hidden="true" />
        Nuevo Analisis
      </Link>
    </div>
  );
}

interface RecentAnalysisCardProps {
  analysis: {
    id: string;
    sequenceName: string;
    status: string;
    createdAt: Date;
    variantCount: number;
  };
}

function RecentAnalysisCard({ analysis }: RecentAnalysisCardProps) {
  const statusStyles = {
    PENDING: "text-yellow-600 bg-yellow-100",
    PROCESSING: "text-blue-600 bg-blue-100",
    COMPLETED: "text-green-600 bg-green-100",
    FAILED: "text-red-600 bg-red-100",
  };

  const statusLabels = {
    PENDING: "Pendiente",
    PROCESSING: "Procesando",
    COMPLETED: "Completado",
    FAILED: "Fallido",
  };

  const style = statusStyles[analysis.status as keyof typeof statusStyles] ?? statusStyles.PENDING;
  const label = statusLabels[analysis.status as keyof typeof statusLabels] ?? "Desconocido";

  return (
    <Link
      href={`/dashboard/analysis/${analysis.id}`}
      className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-2" aria-hidden="true">
          <DNAIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-text">{analysis.sequenceName}</p>
          <p className="text-sm text-text-lighter">
            {new Date(analysis.createdAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {analysis.status === "COMPLETED" && (
          <span className="text-sm text-text-light">
            {analysis.variantCount} variantes
          </span>
        )}
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${style}`}>
          {label}
        </span>
      </div>
    </Link>
  );
}
