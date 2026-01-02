"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import type { Variant } from "./variant-table";

interface ExportPanelProps {
  jobId: string;
  jobName: string;
  variants: Variant[];
  chromosome?: string | null;
  blastIdentity?: number | null;
}

type ExportFormat = "pdf" | "csv" | "vcf";

export function ExportPanel({
  jobId,
  jobName,
  variants,
  chromosome,
  blastIdentity,
}: ExportPanelProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);

    try {
      switch (format) {
        case "pdf":
          await exportPDF();
          break;
        case "csv":
          exportCSV();
          break;
        case "vcf":
          exportVCF();
          break;
      }
    } catch (error) {
      console.error("Error exporting:", error);
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Primary blue
    doc.text("SNP Analyzer - Reporte de Variantes", pageWidth / 2, 20, {
      align: "center",
    });

    // Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Analisis: ${jobName}`, 14, 35);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 42);
    doc.text(`ID: ${jobId}`, 14, 49);
    if (chromosome) {
      doc.text(`Cromosoma: ${chromosome}`, 14, 56);
    }
    if (blastIdentity) {
      doc.text(`Identidad BLAST: ${blastIdentity.toFixed(2)}%`, 14, 63);
    }

    // Summary
    const yStart = chromosome ? 75 : 62;
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("Resumen", 14, yStart);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Count by significance
    const significanceCounts = variants.reduce((acc, v) => {
      const sig = v.clinicalSignificance ?? "unknown";
      acc[sig] = (acc[sig] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summaryLines = [
      `Total de variantes: ${variants.length}`,
      ...Object.entries(significanceCounts).map(
        ([sig, count]) => `  - ${formatSignificance(sig)}: ${count}`
      ),
    ];

    summaryLines.forEach((line, i) => {
      doc.text(line, 14, yStart + 8 + i * 6);
    });

    // Table
    const tableStartY = yStart + 8 + summaryLines.length * 6 + 10;

    autoTable(doc, {
      startY: tableStartY,
      head: [["Posicion", "Ref/Alt", "rsID", "Gen", "Consecuencia", "Significancia"]],
      body: variants.map((v) => [
        `${v.chromosome}:${v.position}`,
        `${v.referenceAllele}>${v.alternateAllele}`,
        v.rsId ?? "-",
        v.geneSymbol ?? "-",
        formatConsequence(v.consequence),
        formatSignificance(v.clinicalSignificance),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        "Generado por SNP Analyzer - Este reporte es solo para fines informativos",
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
      doc.text(
        `Pagina ${i} de ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: "right" }
      );
    }

    // Save
    doc.save(`snp-analyzer-${jobId.slice(0, 8)}.pdf`);
  };

  const exportCSV = () => {
    const data = variants.map((v) => ({
      Cromosoma: v.chromosome,
      Posicion: v.position,
      Referencia: v.referenceAllele,
      Alternativo: v.alternateAllele,
      rsID: v.rsId ?? "",
      HGVS: v.hgvsNotation ?? "",
      Gen: v.geneSymbol ?? "",
      Tipo: v.variantType,
      Consecuencia: v.consequence ?? "",
      Significancia_Clinica: v.clinicalSignificance ?? "",
      Frecuencia_Poblacional: v.populationFrequency ?? "",
      REVEL_Score: v.revelScore ?? "",
      CADD_Score: v.caddScore ?? "",
      SIFT: v.siftPrediction ?? "",
      PolyPhen: v.polyphenPrediction ?? "",
    }));

    const csv = Papa.unparse(data);
    downloadFile(csv, `snp-analyzer-${jobId.slice(0, 8)}.csv`, "text/csv");
  };

  const exportVCF = () => {
    const lines = [
      "##fileformat=VCFv4.2",
      `##fileDate=${new Date().toISOString().split("T")[0]?.replace(/-/g, "")}`,
      "##source=SNPAnalyzerWeb",
      `##reference=GRCh38`,
      '##INFO=<ID=RS,Number=1,Type=String,Description="dbSNP ID">',
      '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
      '##INFO=<ID=CSQ,Number=1,Type=String,Description="Consequence">',
      '##INFO=<ID=CLNSIG,Number=1,Type=String,Description="Clinical significance">',
      '##INFO=<ID=AF,Number=1,Type=Float,Description="Population frequency">',
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO",
    ];

    variants.forEach((v) => {
      const chrom = v.chromosome.replace("chr", "");
      const info: string[] = [];

      if (v.rsId) info.push(`RS=${v.rsId}`);
      if (v.geneSymbol) info.push(`GENE=${v.geneSymbol}`);
      if (v.consequence) info.push(`CSQ=${v.consequence}`);
      if (v.clinicalSignificance) info.push(`CLNSIG=${v.clinicalSignificance}`);
      if (v.populationFrequency) info.push(`AF=${v.populationFrequency}`);

      const line = [
        chrom,
        v.position,
        v.rsId ?? ".",
        v.referenceAllele,
        v.alternateAllele,
        ".",
        "PASS",
        info.length > 0 ? info.join(";") : ".",
      ].join("\t");

      lines.push(line);
    });

    const vcf = lines.join("\n");
    downloadFile(vcf, `snp-analyzer-${jobId.slice(0, 8)}.vcf`, "text/plain");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <ExportButton
        format="pdf"
        label="Exportar PDF"
        icon={<PDFIcon className="h-5 w-5" />}
        onClick={() => handleExport("pdf")}
        loading={exporting === "pdf"}
      />
      <ExportButton
        format="csv"
        label="Exportar CSV"
        icon={<CSVIcon className="h-5 w-5" />}
        onClick={() => handleExport("csv")}
        loading={exporting === "csv"}
      />
      <ExportButton
        format="vcf"
        label="Exportar VCF"
        icon={<VCFIcon className="h-5 w-5" />}
        onClick={() => handleExport("vcf")}
        loading={exporting === "vcf"}
      />
    </div>
  );
}

// Sub-components
function ExportButton({
  format,
  label,
  icon,
  onClick,
  loading,
}: {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
}) {
  const colors: Record<ExportFormat, string> = {
    pdf: "border-red-500/20 hover:bg-red-500/10 text-red-400",
    csv: "border-green-500/20 hover:bg-green-500/10 text-green-400",
    vcf: "border-blue-500/20 hover:bg-blue-500/10 text-blue-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition disabled:opacity-50 ${colors[format]}`}
    >
      {loading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// Helper functions
function formatConsequence(consequence: string | null): string {
  if (!consequence) return "-";
  return consequence.replace(/_/g, " ");
}

function formatSignificance(significance: string | null): string {
  if (!significance) return "-";
  const labels: Record<string, string> = {
    pathogenic: "Patogenico",
    likely_pathogenic: "Prob. Patogenico",
    uncertain_significance: "VUS",
    likely_benign: "Prob. Benigno",
    benign: "Benigno",
    unknown: "Desconocido",
  };
  return labels[significance] ?? significance;
}

// Icons
function PDFIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4.5c1.93 0 3.5-1.07 3.5-2.5S10.43 13 8.5 13 5 14.07 5 15.5 6.57 17.5 8.5 17.5z" />
    </svg>
  );
}

function CSVIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h2v2H8v-2zm0-3h2v2H8v-2zm4 3h2v2h-2v-2zm0-3h2v2h-2v-2z" />
    </svg>
  );
}

function VCFIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
