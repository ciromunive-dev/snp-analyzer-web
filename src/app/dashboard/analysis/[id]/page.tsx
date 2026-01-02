"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Sidebar } from "~/components/ui/sidebar";
import { VariantTable, type Variant } from "~/components/variant-table";
import { VariantDetail } from "~/components/variant-detail";
import { ExportPanel } from "~/components/export-panel";
import {
  DNAIcon,
  ArrowLeftIcon,
  TrashIcon,
  ChromosomeIcon,
  PercentIcon,
  ChartIcon,
  SpinnerIcon,
  ErrorIcon,
} from "~/components/icons";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default function AnalysisResultsPage({ params }: AnalysisPageProps) {
  // Next.js 16: params es una Promise, usar use() para unwrap
  const { id: jobId } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const { data: results, isLoading, error } = api.analysis.results.useQuery({ jobId });

  const deleteMutation = api.analysis.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <SpinnerIcon className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-400">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!session) {
    router.push("/api/auth/signin");
    return null;
  }

  if (error || !results) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ErrorIcon className="mx-auto mb-4 h-12 w-12 text-red-500" aria-hidden="true" />
          <h2 className="mb-2 text-xl font-semibold">Error al cargar</h2>
          <p className="mb-4 text-gray-400">
            {error?.message ?? "No se encontro el analisis"}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session.user} />

      {/* Main Content */}
      <main className={`min-h-screen p-4 pt-16 md:ml-64 md:p-8 md:pt-8 ${selectedVariant ? "lg:mr-96" : ""}`}>
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="-ml-2 mb-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-gray-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold">{results.sequenceName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span>Creado: {new Date(results.createdAt).toLocaleString()}</span>
              {results.completedAt && (
                <span>
                  Completado: {new Date(results.completedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm("¿Estas seguro de eliminar este analisis?")) {
                deleteMutation.mutate({ jobId });
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-red-400 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Eliminar analisis"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            Eliminar
          </button>
        </header>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Variantes"
            value={results.variants.length.toString()}
            icon={<DNAIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Cromosoma"
            value={results.chromosome ?? "-"}
            icon={<ChromosomeIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Identidad BLAST"
            value={results.blastIdentity ? `${results.blastIdentity.toFixed(1)}%` : "-"}
            icon={<PercentIcon className="h-5 w-5" />}
          />
          <StatCard
            label="E-value"
            value={results.blastEvalue ? results.blastEvalue.toExponential(2) : "-"}
            icon={<ChartIcon className="h-5 w-5" />}
          />
        </div>

        {/* Export Panel */}
        <div className="mb-6">
          <ExportPanel
            jobId={jobId}
            jobName={results.sequenceName}
            variants={results.variants}
            chromosome={results.chromosome}
            blastIdentity={results.blastIdentity}
          />
        </div>

        {/* Variants Table */}
        {results.variants.length > 0 ? (
          <VariantTable
            variants={results.variants}
            onSelectVariant={setSelectedVariant}
          />
        ) : (
          <div className="rounded-xl border border-white/10 bg-surface p-12 text-center">
            <DNAIcon className="mx-auto mb-4 h-12 w-12 text-gray-500" aria-hidden="true" />
            <h3 className="mb-2 text-lg font-semibold">No se encontraron variantes</h3>
            <p className="text-gray-400">
              La secuencia analizada es identica a la referencia
            </p>
          </div>
        )}
      </main>

      {/* Variant Detail Sidebar */}
      {selectedVariant && (
        <aside className="fixed right-0 top-0 z-40 h-screen w-full max-w-96 border-l border-white/10 bg-surface">
          <VariantDetail
            variant={selectedVariant}
            onClose={() => setSelectedVariant(null)}
          />
        </aside>
      )}
    </div>
  );
}

// Sub-components
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-4">
      <div className="mb-1 flex items-center gap-2 text-gray-400">
        <span aria-hidden="true">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
