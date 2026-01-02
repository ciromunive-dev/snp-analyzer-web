"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SequenceInput } from "~/components/sequence-input";
import { AnalysisStatus } from "~/components/analysis-status";

export default function NewAnalysisPage() {
  const router = useRouter();
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const handleSubmitSuccess = (jobId: string) => {
    setCurrentJobId(jobId);
  };

  const handleComplete = () => {
    // El análisis se completó
  };

  const handleViewResults = () => {
    if (currentJobId) {
      router.push(`/dashboard/analysis/${currentJobId}`);
    }
  };

  const handleNewAnalysis = () => {
    setCurrentJobId(null);
  };

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
            <NavLink href="/dashboard/new" icon={<PlusIcon />} active>
              Nuevo Analisis
            </NavLink>
            <NavLink href="/dashboard/history" icon={<ClockIcon />}>
              Historial
            </NavLink>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen p-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Nuevo Analisis</h1>
            <p className="text-gray-400">
              Sube una secuencia de ADN en formato FASTA para detectar variantes
            </p>
          </div>

          {/* Content */}
          {!currentJobId ? (
            <div className="rounded-xl border border-white/10 bg-surface p-6">
              <SequenceInput onSubmitSuccess={handleSubmitSuccess} />
            </div>
          ) : (
            <div className="space-y-4">
              <AnalysisStatus
                jobId={currentJobId}
                onComplete={handleComplete}
                onViewResults={handleViewResults}
              />

              <button
                onClick={handleNewAnalysis}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 py-3 transition hover:bg-white/10"
              >
                <PlusIcon className="h-5 w-5" />
                Nuevo Analisis
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Navigation Link Component
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
