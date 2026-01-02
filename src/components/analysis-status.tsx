"use client";

import { useEffect } from "react";
import { api } from "~/trpc/react";

interface AnalysisStatusProps {
  jobId: string;
  onComplete: () => void;
  onViewResults: () => void;
}

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export function AnalysisStatus({
  jobId,
  onComplete,
  onViewResults,
}: AnalysisStatusProps) {
  const { data: status, refetch } = api.analysis.status.useQuery(
    { jobId },
    {
      refetchInterval: (query) => {
        const data = query.state.data;
        // Dejar de polling cuando está completado o fallido
        if (data?.status === "COMPLETED" || data?.status === "FAILED") {
          return false;
        }
        return 3000; // Poll cada 3 segundos
      },
    }
  );

  // Llamar onComplete cuando termine
  useEffect(() => {
    if (status?.status === "COMPLETED") {
      onComplete();
    }
  }, [status?.status, onComplete]);

  if (!status) {
    return (
      <div className="flex items-center justify-center p-8">
        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{status.sequenceName}</h3>
          <p className="text-sm text-gray-400">
            Iniciado: {new Date(status.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={status.status} />
      </div>

      {/* Progress */}
      <div className="mb-6">
        <ProgressBar status={status.status} />
      </div>

      {/* Status Message */}
      <div className="mb-6">
        <StatusMessage
          status={status.status}
          queuePosition={status.queuePosition}
          variantCount={status.variantCount}
          errorMessage={status.errorMessage}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {status.status === "COMPLETED" && (
          <button
            onClick={onViewResults}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold transition hover:bg-primary-light"
          >
            <EyeIcon className="h-5 w-5" />
            Ver Resultados
          </button>
        )}

        {status.status === "FAILED" && (
          <button
            onClick={() => refetch()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 py-3 font-semibold transition hover:bg-white/10"
          >
            <RefreshIcon className="h-5 w-5" />
            Reintentar
          </button>
        )}

        {(status.status === "PENDING" || status.status === "PROCESSING") && (
          <div className="flex flex-1 items-center justify-center gap-2 py-3 text-gray-400">
            <SpinnerIcon className="h-5 w-5 animate-spin" />
            Procesando...
          </div>
        )}
      </div>

      {/* Additional info for completed */}
      {status.status === "COMPLETED" && status.chromosome && (
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{status.variantCount}</p>
            <p className="text-sm text-gray-400">Variantes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary">{status.chromosome}</p>
            <p className="text-sm text-gray-400">Cromosoma</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">
              {status.blastIdentity?.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-400">Identidad</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function StatusBadge({ status }: { status: JobStatus }) {
  const config = {
    PENDING: {
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      icon: <ClockIcon className="h-4 w-4" />,
      label: "En cola",
    },
    PROCESSING: {
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: <SpinnerIcon className="h-4 w-4 animate-spin" />,
      label: "Procesando",
    },
    COMPLETED: {
      color: "bg-green-500/10 text-green-400 border-green-500/20",
      icon: <CheckIcon className="h-4 w-4" />,
      label: "Completado",
    },
    FAILED: {
      color: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: <ErrorIcon className="h-4 w-4" />,
      label: "Error",
    },
  };

  const { color, icon, label } = config[status];

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 ${color}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ProgressBar({ status }: { status: JobStatus }) {
  const progress = {
    PENDING: 25,
    PROCESSING: 60,
    COMPLETED: 100,
    FAILED: 100,
  };

  const color = {
    PENDING: "bg-yellow-500",
    PROCESSING: "bg-blue-500",
    COMPLETED: "bg-green-500",
    FAILED: "bg-red-500",
  };

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full transition-all duration-500 ${color[status]} ${
          status === "PROCESSING" ? "animate-pulse" : ""
        }`}
        style={{ width: `${progress[status]}%` }}
      />
    </div>
  );
}

function StatusMessage({
  status,
  queuePosition,
  variantCount,
  errorMessage,
}: {
  status: JobStatus;
  queuePosition: number | null | undefined;
  variantCount: number;
  errorMessage: string | null | undefined;
}) {
  switch (status) {
    case "PENDING":
      return (
        <div className="flex items-center gap-3 rounded-lg bg-yellow-500/10 p-4">
          <ClockIcon className="h-6 w-6 text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-400">En cola de procesamiento</p>
            <p className="text-sm text-gray-400">
              {queuePosition
                ? `Posicion aproximada: ${queuePosition}`
                : "Esperando turno..."}
            </p>
          </div>
        </div>
      );

    case "PROCESSING":
      return (
        <div className="flex items-center gap-3 rounded-lg bg-blue-500/10 p-4">
          <DNAIcon className="h-6 w-6 animate-pulse text-blue-400" />
          <div>
            <p className="font-medium text-blue-400">Analizando secuencia</p>
            <p className="text-sm text-gray-400">
              Ejecutando BLAST y detectando variantes...
            </p>
          </div>
        </div>
      );

    case "COMPLETED":
      return (
        <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4">
          <CheckIcon className="h-6 w-6 text-green-400" />
          <div>
            <p className="font-medium text-green-400">Analisis completado</p>
            <p className="text-sm text-gray-400">
              Se encontraron {variantCount} variantes
            </p>
          </div>
        </div>
      );

    case "FAILED":
      return (
        <div className="flex items-center gap-3 rounded-lg bg-red-500/10 p-4">
          <ErrorIcon className="h-6 w-6 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Error en el analisis</p>
            <p className="text-sm text-gray-400">
              {errorMessage ?? "Ocurrio un error durante el procesamiento"}
            </p>
          </div>
        </div>
      );
  }
}

// Icons
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

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
