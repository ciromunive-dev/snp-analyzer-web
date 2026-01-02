import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { Sidebar } from "~/components/ui/sidebar";
import { api } from "~/trpc/server";
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

  if (!session) {
    redirect("/api/auth/signin");
  }

  // Fetch real stats
  const stats = await api.analysis.stats();
  const historyData = await api.analysis.history({});
  const recentAnalyses = historyData.jobs;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session.user} />

      {/* Main Content */}
      <main className="min-h-screen p-4 pt-16 md:ml-64 md:p-8 md:pt-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-300">
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
          <h2 id="actions-heading" className="mb-4 text-xl font-semibold">Acciones rapidas</h2>
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
          <h2 id="recent-heading" className="mb-4 text-xl font-semibold">Analisis recientes</h2>
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
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface py-3 text-gray-300 transition hover:bg-surface-light hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
    <div className="rounded-xl border border-white/10 bg-surface p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-gray-300">{title}</span>
        <span className={color} aria-hidden="true">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
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
      className="group rounded-xl border border-white/10 bg-surface p-6 transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div
        className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition group-hover:bg-primary group-hover:text-white"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-300">{description}</p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-8 text-center">
      <DNAIcon className="mx-auto mb-4 h-12 w-12 text-gray-500" aria-hidden="true" />
      <p className="mb-2 text-lg font-medium">No hay analisis aun</p>
      <p className="mb-4 text-gray-300">
        Comienza subiendo tu primera secuencia FASTA
      </p>
      <Link
        href="/dashboard/new"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
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
    PENDING: "text-yellow-400 bg-yellow-500/10",
    PROCESSING: "text-blue-400 bg-blue-500/10",
    COMPLETED: "text-green-400 bg-green-500/10",
    FAILED: "text-red-400 bg-red-500/10",
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
      className="flex items-center justify-between rounded-xl border border-white/10 bg-surface p-4 transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-2" aria-hidden="true">
          <DNAIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{analysis.sequenceName}</p>
          <p className="text-sm text-gray-400">
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
          <span className="text-sm text-gray-300">
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
