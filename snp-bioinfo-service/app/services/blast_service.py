"""Servicio de alineamiento BLAT contra genoma humano GRCh38 usando UCSC."""

import re
import structlog
import httpx
from dataclasses import dataclass
from typing import Self

from app.config import settings

logger = structlog.get_logger(__name__)

# URL de la API BLAT de UCSC
UCSC_BLAT_URL = "https://genome.ucsc.edu/cgi-bin/hgBlat"


@dataclass
class BlastHit:
    """Representa un hit de alineamiento (compatible con el código existente)."""

    chromosome: str
    start: int
    end: int
    identity: float
    evalue: float  # BLAT no usa e-value, usamos score convertido
    query_sequence: str
    subject_sequence: str
    alignment_length: int

    @classmethod
    def from_blat_result(cls, blat_data: dict, query_seq: str) -> Self:
        """Crea un BlastHit desde resultado de BLAT."""
        # BLAT devuelve coordenadas 0-based, convertimos a 1-based
        chrom = blat_data.get("tName", "unknown")
        start = int(blat_data.get("tStart", 0)) + 1  # Convertir a 1-based
        end = int(blat_data.get("tEnd", 0))

        # Calcular identidad
        matches = int(blat_data.get("matches", 0))
        mismatches = int(blat_data.get("misMatches", 0))
        total = matches + mismatches
        identity = (matches / total * 100) if total > 0 else 0

        # BLAT usa score, lo convertimos a un pseudo e-value (menor es mejor)
        score = int(blat_data.get("score", 0))
        evalue = 1.0 / (score + 1) if score > 0 else 1.0

        alignment_length = int(blat_data.get("qSize", len(query_seq)))

        return cls(
            chromosome=chrom,
            start=start,
            end=end,
            identity=identity,
            evalue=evalue,
            query_sequence=query_seq,
            subject_sequence="",  # BLAT no devuelve la secuencia subject directamente
            alignment_length=alignment_length,
        )


@dataclass
class BlastResult:
    """Resultado completo de alineamiento (compatible con el código existente)."""

    hits: list[BlastHit]
    best_hit: BlastHit | None
    query_length: int

    @property
    def has_hits(self) -> bool:
        """Indica si hay hits."""
        return len(self.hits) > 0


class BlastService:
    """Servicio para ejecutar alineamiento contra genoma humano usando UCSC BLAT."""

    def __init__(self) -> None:
        """Inicializa el servicio de alineamiento."""
        self.assembly = "hg38"  # GRCh38

    async def align(self, sequence: str) -> BlastResult:
        """
        Ejecuta BLAT contra genoma humano GRCh38 y retorna resultados.

        Args:
            sequence: Secuencia de ADN a alinear

        Returns:
            BlastResult con los hits encontrados
        """
        logger.info("Iniciando BLAT contra GRCh38", sequence_length=len(sequence))

        try:
            # Llamar a la API de UCSC BLAT
            hits = await self._call_ucsc_blat(sequence)

            if not hits:
                logger.warning("BLAT no encontró alineamientos")
                return BlastResult(hits=[], best_hit=None, query_length=len(sequence))

            # Ordenar por score (menor evalue = mejor)
            hits.sort(key=lambda x: x.evalue)
            best_hit = hits[0]

            logger.info(
                "BLAT completado",
                total_hits=len(hits),
                best_chromosome=best_hit.chromosome,
                best_start=best_hit.start,
                best_end=best_hit.end,
                best_identity=best_hit.identity,
            )

            return BlastResult(
                hits=hits,
                best_hit=best_hit,
                query_length=len(sequence),
            )

        except Exception as e:
            logger.error("Error en BLAT", error=str(e))
            raise

    async def _call_ucsc_blat(self, sequence: str) -> list[BlastHit]:
        """Llama a la API de UCSC BLAT y parsea los resultados."""

        # Limpiar secuencia
        clean_seq = re.sub(r'[^ATCGN]', '', sequence.upper())

        if len(clean_seq) < 20:
            logger.warning("Secuencia muy corta para BLAT", length=len(clean_seq))
            return []

        # Parámetros para BLAT
        params = {
            "userSeq": clean_seq,
            "type": "DNA",
            "db": self.assembly,
            "output": "json",
        }

        logger.debug("Llamando a UCSC BLAT", assembly=self.assembly, seq_length=len(clean_seq))

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(UCSC_BLAT_URL, params=params)
            response.raise_for_status()

            # BLAT devuelve JSON con los resultados
            data = response.json()

        hits = []
        blat_results = data.get("blat", [])

        logger.debug("BLAT resultados recibidos", count=len(blat_results))

        for result in blat_results:
            # Filtrar solo cromosomas principales (chr1-22, X, Y)
            chrom = result.get("tName", "")
            if not re.match(r'^chr(\d+|X|Y)$', chrom):
                continue

            hit = BlastHit.from_blat_result(result, clean_seq)

            # Solo incluir hits con buena identidad (>80%)
            if hit.identity >= 80:
                hits.append(hit)
                logger.debug(
                    "Hit encontrado",
                    chromosome=hit.chromosome,
                    start=hit.start,
                    end=hit.end,
                    identity=hit.identity,
                )

        return hits


# Instancia global (mantiene compatibilidad con imports existentes)
blast_service = BlastService()
