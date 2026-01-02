"""Servicio de alineamiento BLAST contra genoma humano."""

import re
import structlog
from dataclasses import dataclass
from io import StringIO
from typing import Self

from Bio.Blast import NCBIWWW, NCBIXML

from app.config import settings

logger = structlog.get_logger(__name__)


@dataclass
class BlastHit:
    """Representa un hit de BLAST."""

    chromosome: str
    start: int
    end: int
    identity: float
    evalue: float
    query_sequence: str
    subject_sequence: str
    alignment_length: int

    @classmethod
    def from_hsp(
        cls,
        hsp: object,
        alignment_title: str,
    ) -> Self:
        """Crea un BlastHit desde un HSP de Biopython."""
        chromosome = cls._extract_chromosome(alignment_title)

        return cls(
            chromosome=chromosome,
            start=hsp.sbjct_start,
            end=hsp.sbjct_end,
            identity=(hsp.identities / hsp.align_length) * 100,
            evalue=hsp.expect,
            query_sequence=hsp.query,
            subject_sequence=hsp.sbjct,
            alignment_length=hsp.align_length,
        )

    @staticmethod
    def _extract_chromosome(title: str) -> str:
        """Extrae el identificador del cromosoma del título del hit."""
        # Buscar patrones como "chromosome 17" o "chr17"
        match = re.search(r"chromosome\s+(\d+|X|Y)", title, re.IGNORECASE)
        if match:
            return f"chr{match.group(1)}"

        match = re.search(r"chr(\d+|X|Y)", title, re.IGNORECASE)
        if match:
            return f"chr{match.group(1)}"

        # Buscar NC_ accession para cromosomas humanos
        match = re.search(r"NC_0000(\d{2})", title)
        if match:
            chrom_num = int(match.group(1))
            if chrom_num <= 22:
                return f"chr{chrom_num}"
            elif chrom_num == 23:
                return "chrX"
            elif chrom_num == 24:
                return "chrY"

        return "unknown"


@dataclass
class BlastResult:
    """Resultado completo de BLAST."""

    hits: list[BlastHit]
    best_hit: BlastHit | None
    query_length: int

    @property
    def has_hits(self) -> bool:
        """Indica si hay hits."""
        return len(self.hits) > 0


class BlastService:
    """Servicio para ejecutar BLAST contra genoma humano."""

    def __init__(self) -> None:
        """Inicializa el servicio de BLAST."""
        self.email = settings.ncbi_email
        self.api_key = settings.ncbi_api_key

    async def align(self, sequence: str) -> BlastResult:
        """
        Ejecuta BLAST contra genoma humano y retorna resultados.

        Args:
            sequence: Secuencia de ADN a alinear

        Returns:
            BlastResult con los hits encontrados
        """
        logger.info("Iniciando BLAST", sequence_length=len(sequence))

        if not self.email:
            raise ValueError("NCBI_EMAIL es requerido para usar BLAST")

        try:
            # Ejecutar BLAST (esto es bloqueante, en producción usar threads)
            result_handle = NCBIWWW.qblast(
                program="blastn",
                database="nt",
                sequence=sequence,
                entrez_query="Homo sapiens[organism]",
                hitlist_size=10,
                expect=0.001,
                word_size=11,
                megablast=True,
            )

            # Parsear resultados
            blast_record = NCBIXML.read(result_handle)
            result_handle.close()

            hits: list[BlastHit] = []

            for alignment in blast_record.alignments:
                for hsp in alignment.hsps:
                    hit = BlastHit.from_hsp(hsp, alignment.title)
                    hits.append(hit)

            # Ordenar por e-value (menor es mejor)
            hits.sort(key=lambda x: x.evalue)
            best_hit = hits[0] if hits else None

            logger.info(
                "BLAST completado",
                total_hits=len(hits),
                best_chromosome=best_hit.chromosome if best_hit else None,
                best_identity=best_hit.identity if best_hit else None,
            )

            return BlastResult(
                hits=hits,
                best_hit=best_hit,
                query_length=len(sequence),
            )

        except Exception as e:
            logger.error("Error en BLAST", error=str(e))
            raise


# Instancia global
blast_service = BlastService()
