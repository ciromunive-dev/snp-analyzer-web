import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { Sidebar } from "~/components/ui/sidebar";
import { api } from "~/trpc/server";
import { DNAIcon, ClockIcon, CheckIcon, ErrorIcon, ArrowRightIcon } from "~/components/icons";

export default async function HistoryPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const historyData = await api.analysis.history({});
  const analyses = historyData.jobs;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session.user} />

      <main className="min-h-screen p-4 pt-16 md:ml-64 md:p-8 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Historial de Analisis</h1>
          <p className="text-gray-400">
            Todos tus analisis anteriores
          </p>
        </div>

        {/* Analyses list */}
        {analyses.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis: typeof analyses[number]) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-12 text-center">
      <ClockIcon className="mx-auto mb-4 h-12 w-12 text-gray-500" aria-hidden="true" />
      <h2 className="mb-2 text-lg font-semibold">No hay analisis en el historial</h2>
      <p className="mb-6 text-gray-400">
        Comienza creando tu primer analisis de secuencia
      </p>
      <Link
        href="/dashboard/new"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        Nuevo Analisis
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

interface AnalysisCardProps {
  analysis: {
    id: string;
    sequenceName: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
    variantCount: number;
  };
}

function AnalysisCard({ analysis }: AnalysisCardProps) {
  const statusConfig = {
    PENDING: {
      label: "Pendiente",
      color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      icon: <ClockIcon className="h-4 w-4" />,
    },
    PROCESSING: {
      label: "Procesando",
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      icon: <ClockIcon className="h-4 w-4 animate-spin" />,
    },
    COMPLETED: {
      label: "Completado",
      color: "text-green-400 bg-green-500/10 border-green-500/20",
      icon: <CheckIcon className="h-4 w-4" />,
    },
    FAILED: {
      label: "Fallido",
      color: "text-red-400 bg-red-500/10 border-red-500/20",
      icon: <ErrorIcon className="h-4 w-4" />,
    },
  };

  const status = statusConfig[analysis.status as keyof typeof statusConfig] ?? statusConfig.PENDING;

  return (
    <Link
      href={`/dashboard/analysis/${analysis.id}`}
      className="block rounded-xl border border-white/10 bg-surface p-6 transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <DNAIcon className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold">{analysis.sequenceName}</h3>
            <p className="text-sm text-gray-400">
              Creado: {new Date(analysis.createdAt).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {analysis.completedAt && (
              <p className="text-sm text-gray-400">
                Completado: {new Date(analysis.completedAt).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {analysis.status === "COMPLETED" && (
            <div className="text-right">
              <p className="text-2xl font-bold">{analysis.variantCount}</p>
              <p className="text-sm text-gray-400">variantes</p>
            </div>
          )}
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${status.color}`}
          >
            <span aria-hidden="true">{status.icon}</span>
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
