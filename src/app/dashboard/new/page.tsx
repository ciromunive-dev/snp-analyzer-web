"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sidebar } from "~/components/ui/sidebar";
import { SequenceInput } from "~/components/sequence-input";
import { AnalysisStatus } from "~/components/analysis-status";
import { ArrowLeftIcon, PlusIcon, SpinnerIcon } from "~/components/icons";

export default function NewAnalysisPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const handleSubmitSuccess = (jobId: string) => {
    setCurrentJobId(jobId);
  };

  const handleComplete = () => {
    // Analysis completed
  };

  const handleViewResults = () => {
    if (currentJobId) {
      router.push(`/dashboard/analysis/${currentJobId}`);
    }
  };

  const handleNewAnalysis = () => {
    setCurrentJobId(null);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <SpinnerIcon className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!session) {
    router.push("/api/auth/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session.user} />

      {/* Main Content */}
      <main className="min-h-screen p-4 pt-16 md:ml-64 md:p-8 md:pt-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <header className="mb-8">
            <Link
              href="/dashboard"
              className="-ml-2 mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-gray-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Nuevo Analisis</h1>
            <p className="text-gray-300">
              Sube una secuencia de ADN en formato FASTA para detectar variantes
            </p>
          </header>

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
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 py-3 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <PlusIcon className="h-5 w-5" aria-hidden="true" />
                Nuevo Analisis
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
