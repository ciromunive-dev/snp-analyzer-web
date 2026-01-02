"use client";

import { useCallback, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "~/trpc/react";

interface SequenceInputProps {
  onSubmitSuccess: (jobId: string) => void;
}

interface BaseCount {
  A: number;
  T: number;
  G: number;
  C: number;
  N: number;
  other: number;
}

type InputState = "idle" | "validating" | "submitting" | "error" | "success";

export function SequenceInput({ onSubmitSuccess }: SequenceInputProps) {
  const [sequence, setSequence] = useState("");
  const [sequenceName, setSequenceName] = useState("");
  const [state, setState] = useState<InputState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const submitMutation = api.analysis.submit.useMutation({
    onSuccess: (data) => {
      setState("success");
      onSubmitSuccess(data.jobId);
      // Reset form
      setSequence("");
      setSequenceName("");
    },
    onError: (error) => {
      setState("error");
      setErrorMessage(error.message);
    },
  });

  // Parsear y limpiar secuencia
  const cleanSequence = useMemo(() => {
    const lines = sequence.split("\n");
    const seqLines = lines.filter((line) => !line.startsWith(">"));
    return seqLines.join("").replace(/\s/g, "").toUpperCase();
  }, [sequence]);

  // Contar bases
  const baseCounts = useMemo((): BaseCount => {
    const counts: BaseCount = { A: 0, T: 0, G: 0, C: 0, N: 0, other: 0 };
    for (const char of cleanSequence) {
      if (char in counts) {
        counts[char as keyof BaseCount]++;
      } else {
        counts.other++;
      }
    }
    return counts;
  }, [cleanSequence]);

  // Extraer nombre del header FASTA
  const extractedName = useMemo(() => {
    const headerLine = sequence.split("\n").find((line) => line.startsWith(">"));
    if (headerLine) {
      return headerLine.substring(1).trim().slice(0, 100);
    }
    return "";
  }, [sequence]);

  // Validar secuencia
  const validation = useMemo(() => {
    if (!cleanSequence) {
      return { valid: false, message: "" };
    }
    if (cleanSequence.length < 10) {
      return { valid: false, message: "La secuencia debe tener al menos 10 caracteres" };
    }
    if (cleanSequence.length > 100000) {
      return { valid: false, message: "La secuencia no puede exceder 100,000 caracteres" };
    }
    if (baseCounts.other > 0) {
      return { valid: false, message: "La secuencia contiene caracteres invalidos" };
    }
    return { valid: true, message: "" };
  }, [cleanSequence, baseCounts]);

  // Manejar archivos dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setSequence(text);
      setState("idle");
      setErrorMessage("");
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".fasta", ".fa", ".txt", ".fna"],
    },
    maxFiles: 1,
    maxSize: 1024 * 1024, // 1MB
  });

  // Enviar análisis
  const handleSubmit = async () => {
    if (!validation.valid) return;

    setState("submitting");
    setErrorMessage("");

    submitMutation.mutate({
      sequence: sequence,
      name: sequenceName || extractedName || "Sin nombre",
    });
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-white/20 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg font-medium text-primary">Suelta el archivo aqui...</p>
        ) : (
          <>
            <p className="text-lg font-medium">
              Arrastra un archivo FASTA o haz clic para seleccionar
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Formatos: .fasta, .fa, .txt, .fna (max 1MB)
            </p>
          </>
        )}
      </div>

      {/* Separador */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-sm text-gray-400">o pega directamente</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Textarea */}
      <div>
        <label className="mb-2 block text-sm font-medium">Secuencia FASTA</label>
        <textarea
          value={sequence}
          onChange={(e) => {
            setSequence(e.target.value);
            setState("idle");
            setErrorMessage("");
          }}
          placeholder={`>mi_secuencia\nATGCATGCATGCATGC...`}
          className="h-48 w-full rounded-lg border border-white/20 bg-background-light p-4 font-mono text-sm placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Preview y contadores */}
      {cleanSequence && (
        <div className="rounded-lg border border-white/10 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            <span className="text-sm text-gray-400">
              {cleanSequence.length.toLocaleString()} bp
            </span>
          </div>

          {/* Sequence preview */}
          <div className="mb-4 overflow-hidden rounded bg-background-light p-3 font-mono text-xs">
            <span className="break-all">
              {cleanSequence.slice(0, 200)}
              {cleanSequence.length > 200 && (
                <span className="text-gray-500">... (+{cleanSequence.length - 200} mas)</span>
              )}
            </span>
          </div>

          {/* Base counts */}
          <div className="flex flex-wrap gap-3">
            <BaseCounter base="A" count={baseCounts.A} color="bg-green-500" />
            <BaseCounter base="T" count={baseCounts.T} color="bg-red-500" />
            <BaseCounter base="G" count={baseCounts.G} color="bg-yellow-500" />
            <BaseCounter base="C" count={baseCounts.C} color="bg-blue-500" />
            {baseCounts.N > 0 && (
              <BaseCounter base="N" count={baseCounts.N} color="bg-gray-500" />
            )}
            {baseCounts.other > 0 && (
              <BaseCounter base="?" count={baseCounts.other} color="bg-red-700" />
            )}
          </div>
        </div>
      )}

      {/* Nombre de secuencia */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          Nombre del analisis (opcional)
        </label>
        <input
          type="text"
          value={sequenceName}
          onChange={(e) => setSequenceName(e.target.value)}
          placeholder={extractedName || "Ej: BRCA1 paciente 001"}
          className="w-full rounded-lg border border-white/20 bg-background-light px-4 py-3 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={255}
        />
      </div>

      {/* Validación / Error */}
      {!validation.valid && validation.message && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-400">
          <ErrorIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{validation.message}</span>
        </div>
      )}

      {state === "error" && errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-400">
          <ErrorIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {state === "success" && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-green-400">
          <CheckIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Analisis enviado correctamente</span>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!validation.valid || state === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-lg font-semibold transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "submitting" ? (
          <>
            <SpinnerIcon className="h-5 w-5 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <DNAIcon className="h-5 w-5" />
            Analizar Secuencia
          </>
        )}
      </button>
    </div>
  );
}

// Sub-components
function BaseCounter({
  base,
  count,
  color,
}: {
  base: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="font-mono text-sm font-medium">{base}</span>
      <span className="text-sm text-gray-400">{count.toLocaleString()}</span>
    </div>
  );
}

// Icons
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
