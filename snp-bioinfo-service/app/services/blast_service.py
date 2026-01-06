"""Servicio de alineamiento BLAST contra genoma humano."""

import re
import structlog
from dataclasses import dataclass
from io import StringIO
from typing import Self

from Bio.Blast import NCBIWWW, NCBIXML

from app.config import settings

logger = structlog.get_logger(__name__)

# Mapeo de RefSeq accession numbers (GRCh38) a cromosomas
REFSEQ_TO_CHROM = {
    "NC_000001": "chr1",
    "NC_000002": "chr2",
    "NC_000003": "chr3",
    "NC_000004": "chr4",
    "NC_000005": "chr5",
    "NC_000006": "chr6",
    "NC_000007": "chr7",
    "NC_000008": "chr8",
    "NC_000009": "chr9",
    "NC_000010": "chr10",
    "NC_000011": "chr11",
    "NC_000012": "chr12",
    "NC_000013": "chr13",
    "NC_000014": "chr14",
    "NC_000015": "chr15",
    "NC_000016": "chr16",
    "NC_000017": "chr17",
    "NC_000018": "chr18",
    "NC_000019": "chr19",
    "NC_000020": "chr20",
    "NC_000021": "chr21",
    "NC_000022": "chr22",
    "NC_000023": "chrX",
    "NC_000024": "chrY",
}


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
        logger.debug("Extrayendo cromosoma de titulo", title=title[:200])

        # Patrón 1 (PRIORITARIO): NC_ accession para cromosomas humanos RefSeq (GRCh38)
        # Esto es lo más confiable cuando usamos refseq_select
        match = re.search(r"(NC_0000\d{2})", title)
        if match:
            accession = match.group(1)
            if accession in REFSEQ_TO_CHROM:
                chrom = REFSEQ_TO_CHROM[accession]
                logger.info("Cromosoma encontrado (RefSeq accession)", accession=accession, chrom=chrom)
                return chrom

        # Patrón 2: "chromosome 17" o "chromosome X"
        match = re.search(r"chromosome\s+(\d+|X|Y|x|y)", title, re.IGNORECASE)
        if match:
            chrom = match.group(1).upper()
            logger.debug("Cromosoma encontrado (patron chromosome)", chrom=chrom)
            return f"chr{chrom}"

        # Patrón 3: "chr17" o "chrX"
        match = re.search(r"\bchr(\d+|X|Y)\b", title, re.IGNORECASE)
        if match:
            chrom = match.group(1).upper()
            logger.debug("Cromosoma encontrado (patron chr)", chrom=chrom)
            return f"chr{chrom}"

        # Patrón 4: Buscar "Homo sapiens chromosome X" en descripción más larga
        match = re.search(r"Homo\s+sapiens\s+chromosome\s+(\d+|X|Y)", title, re.IGNORECASE)
        if match:
            chrom = match.group(1).upper()
            logger.debug("Cromosoma encontrado (Homo sapiens chromosome)", chrom=chrom)
            return f"chr{chrom}"

        # Patrón 5: RefSeqGene on chromosome X
        match = re.search(r"RefSeqGene\s+on\s+chromosome\s+(\d+|X|Y)", title, re.IGNORECASE)
        if match:
            chrom = match.group(1).upper()
            logger.debug("Cromosoma encontrado (RefSeqGene)", chrom=chrom)
            return f"chr{chrom}"

        # Patrón 6: Mapear genes conocidos por nombre o sinónimos
        gene_to_chrom = {
            # Gen: cromosoma (incluir variantes de nombre)
            "BRCA1": "chr17",
            "BRCA2": "chr13",
            "TP53": "chr17",
            "P53": "chr17",      # Sinónimo común
            "HUMP53": "chr17",   # Nombre en GenBank antiguo
            "APOE": "chr19",
            "CFTR": "chr7",
            "EGFR": "chr7",
            "KRAS": "chr12",
            "BRAF": "chr7",
            "MYC": "chr8",
            "RB1": "chr13",
            "APC": "chr5",
            "MLH1": "chr3",
            "MSH2": "chr2",
            "PTEN": "chr10",
            "VHL": "chr3",
            "NF1": "chr17",
            "NF2": "chr22",
            "RET": "chr10",
            "WT1": "chr11",
            "ATM": "chr11",
            "CHEK2": "chr22",
            "PALB2": "chr16",
            "CDH1": "chr16",
            "STK11": "chr19",
            "SMAD4": "chr18",
            "BMPR1A": "chr10",
            "MUTYH": "chr1",
        }

        title_upper = title.upper()
        for gene, chrom in gene_to_chrom.items():
            if gene in title_upper:
                logger.info("Cromosoma inferido de gen conocido", gene=gene, chrom=chrom)
                return chrom

        logger.warning("No se pudo extraer cromosoma", title=title[:200])
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
            # Ejecutar BLAST contra nucleotide collection
            # Usamos 'nt' que es rápido, filtrado solo por humano
            result_handle = NCBIWWW.qblast(
                program="blastn",
                database="nt",
                sequence=sequence,
                entrez_query="Homo sapiens[organism]",
                hitlist_size=20,  # Más hits para filtrar después
                expect=0.001,
                word_size=11,
                megablast=True,
            )

            # Parsear resultados
            blast_record = NCBIXML.read(result_handle)
            result_handle.close()

            hits: list[BlastHit] = []
            genomic_hits: list[BlastHit] = []  # Hits con coordenadas genómicas reales

            for alignment in blast_record.alignments:
                logger.info("BLAST alignment encontrado", title=alignment.title[:300])

                # Verificar si es un cromosoma RefSeq (coordenadas genómicas reales)
                is_genomic = bool(re.search(r"NC_0000\d{2}", alignment.title))

                for hsp in alignment.hsps:
                    hit = BlastHit.from_hsp(hsp, alignment.title)
                    hits.append(hit)
                    if is_genomic:
                        genomic_hits.append(hit)

            # Priorizar hits genómicos si existen
            if genomic_hits:
                logger.info("Usando hits genómicos (NC_0000XX)", count=len(genomic_hits))
                genomic_hits.sort(key=lambda x: x.evalue)
                best_hit = genomic_hits[0]
            else:
                # Fallback a todos los hits
                logger.warning("No se encontraron hits genómicos, usando todos los hits")
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
