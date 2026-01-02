"""Detector de variantes a partir de alineamientos BLAST."""

import structlog
from dataclasses import dataclass
from typing import Literal

from app.services.blast_service import BlastResult

logger = structlog.get_logger(__name__)

VariantType = Literal["SNP", "insertion", "deletion"]


@dataclass
class DetectedVariant:
    """Variante detectada en el alineamiento."""

    chromosome: str
    position: int
    reference_allele: str
    alternate_allele: str
    variant_type: VariantType


class VariantDetector:
    """Detecta variantes comparando query con referencia."""

    def detect(self, blast_result: BlastResult) -> list[DetectedVariant]:
        """
        Detecta variantes comparando la secuencia query con la referencia.

        Args:
            blast_result: Resultado del alineamiento BLAST

        Returns:
            Lista de variantes detectadas
        """
        if not blast_result.best_hit:
            logger.warning("No hay hits de BLAST para detectar variantes")
            return []

        hit = blast_result.best_hit
        variants: list[DetectedVariant] = []

        query_seq = hit.query_sequence.upper()
        subject_seq = hit.subject_sequence.upper()

        # Posición en la referencia
        position = hit.start

        for query_base, ref_base in zip(query_seq, subject_seq):
            variant = self._detect_single_position(
                query_base=query_base,
                ref_base=ref_base,
                chromosome=hit.chromosome,
                position=position,
            )

            if variant:
                variants.append(variant)

            # Incrementar posición solo si no es gap en la referencia
            if ref_base != "-":
                position += 1

        logger.info(
            "Deteccion de variantes completada",
            total_variants=len(variants),
            snps=sum(1 for v in variants if v.variant_type == "SNP"),
            insertions=sum(1 for v in variants if v.variant_type == "insertion"),
            deletions=sum(1 for v in variants if v.variant_type == "deletion"),
        )

        return variants

    def _detect_single_position(
        self,
        query_base: str,
        ref_base: str,
        chromosome: str,
        position: int,
    ) -> DetectedVariant | None:
        """Detecta variante en una posición individual."""

        # Deleción en query (inserción en referencia)
        if query_base == "-" and ref_base != "-":
            return DetectedVariant(
                chromosome=chromosome,
                position=position,
                reference_allele=ref_base,
                alternate_allele="-",
                variant_type="deletion",
            )

        # Inserción en query (deleción en referencia)
        if query_base != "-" and ref_base == "-":
            return DetectedVariant(
                chromosome=chromosome,
                position=position,
                reference_allele="-",
                alternate_allele=query_base,
                variant_type="insertion",
            )

        # SNP (sustitución)
        if query_base != ref_base and query_base != "-" and ref_base != "-":
            return DetectedVariant(
                chromosome=chromosome,
                position=position,
                reference_allele=ref_base,
                alternate_allele=query_base,
                variant_type="SNP",
            )

        # No hay variante
        return None


# Instancia global
variant_detector = VariantDetector()
