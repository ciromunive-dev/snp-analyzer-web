"use client";

import type { Variant } from "./variant-table";
import {
  CloseIcon,
  ArrowRightIcon,
  CopyIcon,
  ExternalIcon,
} from "~/components/icons";

interface VariantDetailProps {
  variant: Variant;
  onClose: () => void;
}

export function VariantDetail({ variant, onClose }: VariantDetailProps) {
  const copyToClipboard = () => {
    const text = `
Variante: ${variant.chromosome}:${variant.position} ${variant.referenceAllele}>${variant.alternateAllele}
rsID: ${variant.rsId ?? "N/A"}
Gen: ${variant.geneSymbol ?? "N/A"}
Consecuencia: ${variant.consequence ?? "N/A"}
Significancia Clinica: ${variant.clinicalSignificance ?? "N/A"}
Frecuencia Poblacional: ${variant.populationFrequency ? (variant.populationFrequency * 100).toFixed(4) + "%" : "N/A"}
REVEL Score: ${variant.revelScore?.toFixed(3) ?? "N/A"}
CADD Score: ${variant.caddScore?.toFixed(2) ?? "N/A"}
SIFT: ${variant.siftPrediction ?? "N/A"}
PolyPhen: ${variant.polyphenPrediction ?? "N/A"}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-white/10 bg-surface">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-surface p-4">
        <h3 className="text-lg font-semibold">Detalle de Variante</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-2 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Cerrar detalle de variante"
        >
          <CloseIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-6 p-4">
        {/* Position */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-400">Posicion Genomica</h4>
          <p className="font-mono text-xl">
            {variant.chromosome}:{variant.position.toLocaleString()}
          </p>
          {variant.hgvsNotation && (
            <p className="mt-1 font-mono text-sm text-gray-400">{variant.hgvsNotation}</p>
          )}
        </div>

        {/* Alleles */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-400">Alelos</h4>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-background-light p-3 text-center">
              <p className="text-xs text-gray-400">Referencia</p>
              <p className={`font-mono text-2xl font-bold ${getBaseColor(variant.referenceAllele)}`}>
                {variant.referenceAllele}
              </p>
            </div>
            <ArrowRightIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
            <div className="rounded-lg bg-background-light p-3 text-center">
              <p className="text-xs text-gray-400">Alternativo</p>
              <p className={`font-mono text-2xl font-bold ${getBaseColor(variant.alternateAllele)}`}>
                {variant.alternateAllele}
              </p>
            </div>
          </div>
        </div>

        {/* Identifiers */}
        {(variant.rsId || variant.geneSymbol) && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-400">Identificadores</h4>
            <div className="space-y-2">
              {variant.rsId && (
                <div className="flex items-center justify-between rounded-lg bg-background-light p-3">
                  <span className="text-gray-400">rsID</span>
                  <span className="font-mono font-medium text-primary">{variant.rsId}</span>
                </div>
              )}
              {variant.geneSymbol && (
                <div className="flex items-center justify-between rounded-lg bg-background-light p-3">
                  <span className="text-gray-400">Gen</span>
                  <span className="font-medium">{variant.geneSymbol}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clinical Info */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-400">Informacion Clinica</h4>
          <div className="space-y-2">
            <InfoRow
              label="Tipo"
              value={variant.variantType}
            />
            <InfoRow
              label="Consecuencia"
              value={variant.consequence}
              badge
              badgeColor={getConsequenceColor(variant.consequence)}
            />
            <InfoRow
              label="Significancia"
              value={formatSignificance(variant.clinicalSignificance)}
              badge
              badgeColor={getSignificanceColor(variant.clinicalSignificance)}
            />
            <InfoRow
              label="Frecuencia"
              value={
                variant.populationFrequency
                  ? `${(variant.populationFrequency * 100).toFixed(4)}%`
                  : null
              }
            />
          </div>
        </div>

        {/* Prediction Scores */}
        {(variant.revelScore || variant.caddScore || variant.siftPrediction || variant.polyphenPrediction) && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-400">Scores de Prediccion</h4>
            <div className="space-y-3">
              {variant.revelScore !== null && (
                <ScoreRow label="REVEL" score={variant.revelScore} max={1} />
              )}
              {variant.caddScore !== null && (
                <ScoreRow label="CADD" score={variant.caddScore} max={40} />
              )}
              {variant.siftPrediction && (
                <PredictionRow
                  label="SIFT"
                  prediction={variant.siftPrediction}
                  isDeleterious={variant.siftPrediction === "deleterious"}
                />
              )}
              {variant.polyphenPrediction && (
                <PredictionRow
                  label="PolyPhen"
                  prediction={variant.polyphenPrediction}
                  isDeleterious={variant.polyphenPrediction.includes("damaging")}
                />
              )}
            </div>
          </div>
        )}

        {/* External Links */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-400">Enlaces Externos</h4>
          <div className="grid grid-cols-2 gap-2">
            {variant.rsId && (
              <>
                <ExternalLink
                  href={`https://www.ncbi.nlm.nih.gov/snp/${variant.rsId}`}
                  label="dbSNP"
                />
                <ExternalLink
                  href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${variant.rsId}`}
                  label="ClinVar"
                />
                <ExternalLink
                  href={`https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${variant.rsId}`}
                  label="Ensembl"
                />
              </>
            )}
            <ExternalLink
              href={`https://gnomad.broadinstitute.org/variant/${variant.chromosome.replace("chr", "")}-${variant.position}-${variant.referenceAllele}-${variant.alternateAllele}?dataset=gnomad_r4`}
              label="gnomAD"
            />
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={copyToClipboard}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 py-3 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <CopyIcon className="h-5 w-5" aria-hidden="true" />
          Copiar Informacion
        </button>
      </div>
    </div>
  );
}

// Sub-components
function InfoRow({
  label,
  value,
  badge = false,
  badgeColor = "",
}: {
  label: string;
  value: string | null;
  badge?: boolean;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background-light p-3">
      <span className="text-gray-400">{label}</span>
      {value ? (
        badge ? (
          <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeColor}`}>
            {value}
          </span>
        ) : (
          <span>{value}</span>
        )
      ) : (
        <span className="text-gray-500">-</span>
      )}
    </div>
  );
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = Math.min((score / max) * 100, 100);
  const getColor = () => {
    const normalized = score / max;
    if (normalized >= 0.7) return "bg-red-500";
    if (normalized >= 0.5) return "bg-orange-500";
    if (normalized >= 0.3) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="rounded-lg bg-background-light p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-sm">{score.toFixed(3)}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${score.toFixed(3)}`}
      >
        <div className={`h-full ${getColor()}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function PredictionRow({
  label,
  prediction,
  isDeleterious,
}: {
  label: string;
  prediction: string;
  isDeleterious: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background-light p-3">
      <span className="text-gray-400">{label}</span>
      <span
        className={`rounded-full border px-2 py-0.5 text-xs ${
          isDeleterious
            ? "border-red-500/20 bg-red-500/10 text-red-400"
            : "border-green-500/20 bg-green-500/10 text-green-400"
        }`}
      >
        {prediction}
      </span>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-lg border border-white/20 py-2 text-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {label}
      <ExternalIcon className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

// Helper functions
function getBaseColor(base: string): string {
  const colors: Record<string, string> = {
    A: "text-dna-a",
    T: "text-dna-t",
    G: "text-dna-g",
    C: "text-dna-c",
  };
  return colors[base] ?? "text-gray-400";
}

function getConsequenceColor(consequence: string | null): string {
  if (!consequence) return "border-gray-500/20 bg-gray-500/10 text-gray-400";
  const colors: Record<string, string> = {
    stop_gained: "border-red-500/20 bg-red-500/10 text-red-400",
    frameshift_variant: "border-red-500/20 bg-red-500/10 text-red-400",
    missense_variant: "border-orange-500/20 bg-orange-500/10 text-orange-400",
    synonymous_variant: "border-green-500/20 bg-green-500/10 text-green-400",
  };
  return colors[consequence] ?? "border-gray-500/20 bg-gray-500/10 text-gray-400";
}

function getSignificanceColor(significance: string | null): string {
  if (!significance) return "border-gray-500/20 bg-gray-500/10 text-gray-400";
  const colors: Record<string, string> = {
    pathogenic: "border-pathogenic/20 bg-pathogenic/10 text-pathogenic",
    likely_pathogenic: "border-likely-pathogenic/20 bg-likely-pathogenic/10 text-likely-pathogenic",
    uncertain_significance: "border-uncertain/20 bg-uncertain/10 text-uncertain",
    likely_benign: "border-likely-benign/20 bg-likely-benign/10 text-likely-benign",
    benign: "border-benign/20 bg-benign/10 text-benign",
  };
  return colors[significance] ?? "border-gray-500/20 bg-gray-500/10 text-gray-400";
}

function formatSignificance(significance: string | null): string | null {
  if (!significance) return null;
  const labels: Record<string, string> = {
    pathogenic: "Patogenico",
    likely_pathogenic: "Prob. Patogenico",
    uncertain_significance: "VUS",
    likely_benign: "Prob. Benigno",
    benign: "Benigno",
  };
  return labels[significance] ?? significance;
}
