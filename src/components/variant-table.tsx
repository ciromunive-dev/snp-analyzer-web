"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";

// Tipo de variante basado en el schema de Prisma
export interface Variant {
  id: string;
  chromosome: string;
  position: number;
  referenceAllele: string;
  alternateAllele: string;
  rsId: string | null;
  hgvsNotation: string | null;
  geneSymbol: string | null;
  variantType: string;
  consequence: string | null;
  clinicalSignificance: string | null;
  populationFrequency: number | null;
  revelScore: number | null;
  caddScore: number | null;
  siftPrediction: string | null;
  polyphenPrediction: string | null;
}

interface VariantTableProps {
  variants: Variant[];
  onSelectVariant: (variant: Variant) => void;
}

export function VariantTable({ variants, onSelectVariant }: VariantTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Variant>[]>(
    () => [
      {
        accessorKey: "position",
        header: "Posicion",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.chromosome}:{row.original.position.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "alleles",
        header: "Ref/Alt",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <BaseSpan base={row.original.referenceAllele} />
            <span className="text-gray-500">→</span>
            <BaseSpan base={row.original.alternateAllele} />
          </div>
        ),
      },
      {
        accessorKey: "rsId",
        header: "rsID",
        cell: ({ row }) =>
          row.original.rsId ? (
            <a
              href={`https://www.ncbi.nlm.nih.gov/snp/${row.original.rsId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.rsId}
            </a>
          ) : (
            <span className="text-gray-500">-</span>
          ),
      },
      {
        accessorKey: "geneSymbol",
        header: "Gen",
        cell: ({ row }) =>
          row.original.geneSymbol ? (
            <span className="font-medium">{row.original.geneSymbol}</span>
          ) : (
            <span className="text-gray-500">-</span>
          ),
      },
      {
        accessorKey: "consequence",
        header: "Consecuencia",
        cell: ({ row }) => <ConsequenceBadge consequence={row.original.consequence} />,
        filterFn: (row, id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.consequence ?? "");
        },
      },
      {
        accessorKey: "clinicalSignificance",
        header: "Significancia",
        cell: ({ row }) => (
          <SignificanceBadge significance={row.original.clinicalSignificance} />
        ),
        filterFn: (row, id, value: string[]) => {
          if (!value.length) return true;
          return value.includes(row.original.clinicalSignificance ?? "");
        },
      },
      {
        accessorKey: "populationFrequency",
        header: "Frecuencia",
        cell: ({ row }) =>
          row.original.populationFrequency !== null ? (
            <span className="font-mono text-sm">
              {(row.original.populationFrequency * 100).toFixed(4)}%
            </span>
          ) : (
            <span className="text-gray-500">-</span>
          ),
      },
      {
        accessorKey: "revelScore",
        header: "REVEL",
        cell: ({ row }) =>
          row.original.revelScore !== null ? (
            <ScoreBar score={row.original.revelScore} />
          ) : (
            <span className="text-gray-500">-</span>
          ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: variants,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Obtener valores únicos para filtros
  const uniqueConsequences = useMemo(
    () => [...new Set(variants.map((v) => v.consequence).filter(Boolean))],
    [variants]
  );

  const uniqueSignificances = useMemo(
    () => [...new Set(variants.map((v) => v.clinicalSignificance).filter(Boolean))],
    [variants]
  );

  const uniqueChromosomes = useMemo(
    () => [...new Set(variants.map((v) => v.chromosome))].sort(),
    [variants]
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar por rsID, gen..."
            className="w-full rounded-lg border border-white/20 bg-background-light px-4 py-2 placeholder-gray-500 focus:border-primary focus:outline-none"
          />
        </div>

        {/* Chromosome filter */}
        <select
          onChange={(e) => {
            const value = e.target.value;
            table.getColumn("position")?.setFilterValue(value || undefined);
          }}
          className="rounded-lg border border-white/20 bg-background-light px-4 py-2 focus:border-primary focus:outline-none"
        >
          <option value="">Todos los cromosomas</option>
          {uniqueChromosomes.map((chr) => (
            <option key={chr} value={chr}>
              {chr}
            </option>
          ))}
        </select>

        {/* Significance filter */}
        <select
          onChange={(e) => {
            const value = e.target.value;
            table.getColumn("clinicalSignificance")?.setFilterValue(value ? [value] : []);
          }}
          className="rounded-lg border border-white/20 bg-background-light px-4 py-2 focus:border-primary focus:outline-none"
        >
          <option value="">Toda significancia</option>
          {uniqueSignificances.map((sig) => (
            <option key={sig} value={sig ?? ""}>
              {formatSignificance(sig)}
            </option>
          ))}
        </select>

        {/* Consequence filter */}
        <select
          onChange={(e) => {
            const value = e.target.value;
            table.getColumn("consequence")?.setFilterValue(value ? [value] : []);
          }}
          className="rounded-lg border border-white/20 bg-background-light px-4 py-2 focus:border-primary focus:outline-none"
        >
          <option value="">Toda consecuencia</option>
          {uniqueConsequences.map((cons) => (
            <option key={cons} value={cons ?? ""}>
              {formatConsequence(cons)}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-400">
        Mostrando {table.getFilteredRowModel().rows.length} de {variants.length} variantes
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full">
          <thead className="bg-surface">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span>{header.column.getIsSorted() === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/5">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => {
                  setSelectedRowId(row.original.id);
                  onSelectVariant(row.original);
                }}
                className={`cursor-pointer transition hover:bg-white/5 ${
                  selectedRowId === row.original.id ? "bg-primary/10" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-lg border border-white/20 px-4 py-2 transition hover:bg-white/10 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-lg border border-white/20 px-4 py-2 transition hover:bg-white/10 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper components
function BaseSpan({ base }: { base: string }) {
  const colors: Record<string, string> = {
    A: "text-green-400",
    T: "text-red-400",
    G: "text-yellow-400",
    C: "text-blue-400",
    "-": "text-gray-400",
  };

  return (
    <span className={`font-mono font-bold ${colors[base] ?? "text-gray-400"}`}>
      {base}
    </span>
  );
}

function ConsequenceBadge({ consequence }: { consequence: string | null }) {
  if (!consequence) return <span className="text-gray-500">-</span>;

  const severity: Record<string, string> = {
    stop_gained: "bg-red-500/10 text-red-400 border-red-500/20",
    frameshift_variant: "bg-red-500/10 text-red-400 border-red-500/20",
    splice_acceptor_variant: "bg-red-500/10 text-red-400 border-red-500/20",
    splice_donor_variant: "bg-red-500/10 text-red-400 border-red-500/20",
    missense_variant: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    inframe_insertion: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    inframe_deletion: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    synonymous_variant: "bg-green-500/10 text-green-400 border-green-500/20",
    intron_variant: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  const color = severity[consequence] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${color}`}>
      {formatConsequence(consequence)}
    </span>
  );
}

function SignificanceBadge({ significance }: { significance: string | null }) {
  if (!significance) return <span className="text-gray-500">-</span>;

  const colors: Record<string, string> = {
    pathogenic: "bg-red-500/10 text-red-400 border-red-500/20",
    likely_pathogenic: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    uncertain_significance: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    likely_benign: "bg-lime-500/10 text-lime-400 border-lime-500/20",
    benign: "bg-green-500/10 text-green-400 border-green-500/20",
  };

  const color = colors[significance] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${color}`}>
      {formatSignificance(significance)}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 0.7) return "bg-red-500";
    if (s >= 0.5) return "bg-orange-500";
    if (s >= 0.3) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${getColor(score)}`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <span className="font-mono text-xs">{score.toFixed(2)}</span>
    </div>
  );
}

// Helper functions
function formatConsequence(consequence: string | null): string {
  if (!consequence) return "-";
  return consequence.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatSignificance(significance: string | null): string {
  if (!significance) return "-";
  const labels: Record<string, string> = {
    pathogenic: "Patogenico",
    likely_pathogenic: "Prob. Patogenico",
    uncertain_significance: "VUS",
    likely_benign: "Prob. Benigno",
    benign: "Benigno",
  };
  return labels[significance] ?? significance;
}
