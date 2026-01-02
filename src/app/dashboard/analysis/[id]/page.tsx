"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { VariantTable, type Variant } from "~/components/variant-table";
import { VariantDetail } from "~/components/variant-detail";
import { ExportPanel } from "~/components/export-panel";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default function AnalysisResultsPage({ params }: AnalysisPageProps) {
  // Next.js 16: params es una Promise, usar use() para unwrap
  const { id: jobId } = use(params);
  const router = useRouter();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const { data: results, isLoading, error } = api.analysis.results.useQuery({ jobId });

  const deleteMutation = api.analysis.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <SpinnerIcon className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-400">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ErrorIcon className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold">Error al cargar</h2>
          <p className="mb-4 text-gray-400">
            {error?.message ?? "No se encontro el analisis"}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold transition hover:bg-primary-light"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-surface">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-white/10 p-4">
            <DNAIcon className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SNP Analyzer</span>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <NavLink href="/dashboard" icon={<HomeIcon />}>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/new" icon={<PlusIcon />}>
              Nuevo Analisis
            </NavLink>
            <NavLink href="/dashboard/history" icon={<ClockIcon />}>
              Historial
            </NavLink>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`ml-64 min-h-screen p-8 ${selectedVariant ? "mr-96" : ""}`}>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold">{results.sequenceName}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-400">
              <span>Creado: {new Date(results.createdAt).toLocaleString()}</span>
              {results.completedAt && (
                <span>
                  Completado: {new Date(results.completedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm("¿Estas seguro de eliminar este analisis?")) {
                  deleteMutation.mutate({ jobId });
                }
              }}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-red-400 transition hover:bg-red-500/10"
            >
              <TrashIcon className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
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
            <DNAIcon className="mx-auto mb-4 h-12 w-12 text-gray-500" />
            <h3 className="mb-2 text-lg font-semibold">No se encontraron variantes</h3>
            <p className="text-gray-400">
              La secuencia analizada es identica a la referencia
            </p>
          </div>
        )}
      </main>

      {/* Variant Detail Sidebar */}
      {selectedVariant && (
        <aside className="fixed right-0 top-0 z-40 h-screen w-96 border-l border-white/10 bg-surface">
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
function NavLink({
  href,
  icon,
  children,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-primary text-white"
          : "text-gray-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

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
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Icons
function DNAIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function ChromosomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  );
}

function PercentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
