import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { Sidebar } from "~/components/ui/sidebar";
import { api } from "~/trpc/server";
import { ChartIcon, DNAIcon, CheckIcon, ClockIcon } from "~/components/icons";

export default async function StatsPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const stats = await api.analysis.stats();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session.user} />

      <main className="min-h-screen p-4 pt-16 md:ml-64 md:p-8 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Estadisticas</h1>
          <p className="text-gray-400">
            Resumen de todos tus analisis
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Analisis"
            value={stats.totalAnalyses.toString()}
            icon={<DNAIcon className="h-6 w-6" />}
            color="text-primary"
          />
          <StatCard
            title="Completados"
            value={stats.completedAnalyses.toString()}
            icon={<CheckIcon className="h-6 w-6" />}
            color="text-green-400"
          />
          <StatCard
            title="En Progreso"
            value={stats.processingAnalyses.toString()}
            icon={<ClockIcon className="h-6 w-6" />}
            color="text-yellow-400"
          />
          <StatCard
            title="Total Variantes"
            value={stats.totalVariants.toString()}
            icon={<ChartIcon className="h-6 w-6" />}
            color="text-accent"
          />
        </div>

        {/* Significance Distribution */}
        {stats.totalVariants > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Distribucion por Significancia Clinica</h2>
            <div className="rounded-xl border border-white/10 bg-surface p-6">
              <div className="space-y-4">
                {stats.significanceDistribution.map((item: { significance: string | null; _count: number }) => (
                  <SignificanceBar
                    key={item.significance}
                    label={formatSignificance(item.significance)}
                    count={item._count}
                    total={stats.totalVariants}
                    color={getSignificanceColor(item.significance)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Consequence Distribution */}
        {stats.totalVariants > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Distribucion por Consecuencia</h2>
            <div className="rounded-xl border border-white/10 bg-surface p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.consequenceDistribution.slice(0, 9).map((item: { consequence: string | null; _count: number }) => (
                  <ConsequenceCard
                    key={item.consequence}
                    label={formatConsequence(item.consequence)}
                    count={item._count}
                    color={getConsequenceColor(item.consequence)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalVariants === 0 && (
          <div className="rounded-xl border border-white/10 bg-surface p-12 text-center">
            <ChartIcon className="mx-auto mb-4 h-12 w-12 text-gray-500" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold">Sin datos estadisticos</h2>
            <p className="text-gray-400">
              Las estadisticas apareceran cuando tengas analisis completados con variantes
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

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
        <span className="text-gray-400">{title}</span>
        <span className={color} aria-hidden="true">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function SignificanceBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = (count / total) * 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-gray-400">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ConsequenceCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

function formatSignificance(significance: string | null): string {
  if (!significance) return "Desconocido";
  const labels: Record<string, string> = {
    pathogenic: "Patogenico",
    likely_pathogenic: "Probablemente Patogenico",
    uncertain_significance: "Significancia Incierta (VUS)",
    likely_benign: "Probablemente Benigno",
    benign: "Benigno",
  };
  return labels[significance] ?? significance;
}

function formatConsequence(consequence: string | null): string {
  if (!consequence) return "Desconocido";
  return consequence.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getSignificanceColor(significance: string | null): string {
  const colors: Record<string, string> = {
    pathogenic: "bg-red-500",
    likely_pathogenic: "bg-orange-500",
    uncertain_significance: "bg-yellow-500",
    likely_benign: "bg-lime-500",
    benign: "bg-green-500",
  };
  return colors[significance ?? ""] ?? "bg-gray-500";
}

function getConsequenceColor(consequence: string | null): string {
  const colors: Record<string, string> = {
    stop_gained: "bg-red-500/10 border-red-500/20 text-red-400",
    frameshift_variant: "bg-red-500/10 border-red-500/20 text-red-400",
    missense_variant: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    synonymous_variant: "bg-green-500/10 border-green-500/20 text-green-400",
    intron_variant: "bg-gray-500/10 border-gray-500/20 text-gray-400",
  };
  return colors[consequence ?? ""] ?? "bg-gray-500/10 border-gray-500/20 text-gray-400";
}
