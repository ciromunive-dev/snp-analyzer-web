"""Tests para el detector de variantes."""

import pytest

from app.services.blast_service import BlastHit, BlastResult
from app.services.variant_detector import variant_detector, DetectedVariant


class TestVariantDetector:
    """Tests para VariantDetector."""

    def test_detect_snp(self) -> None:
        """Detecta un SNP (sustitución)."""
        hit = BlastHit(
            chromosome="chr17",
            start=100,
            end=110,
            identity=90.0,
            evalue=1e-10,
            query_sequence="ATGC",
            subject_sequence="ATCC",  # G -> C es SNP
            alignment_length=4,
        )
        blast_result = BlastResult(hits=[hit], best_hit=hit, query_length=4)

        variants = variant_detector.detect(blast_result)

        assert len(variants) == 1
        assert variants[0].variant_type == "SNP"
        assert variants[0].reference_allele == "C"
        assert variants[0].alternate_allele == "G"
        assert variants[0].position == 102

    def test_detect_insertion(self) -> None:
        """Detecta una inserción."""
        hit = BlastHit(
            chromosome="chr17",
            start=100,
            end=103,
            identity=75.0,
            evalue=1e-10,
            query_sequence="ATGC",
            subject_sequence="AT-C",  # Inserción de G
            alignment_length=4,
        )
        blast_result = BlastResult(hits=[hit], best_hit=hit, query_length=4)

        variants = variant_detector.detect(blast_result)

        assert len(variants) == 1
        assert variants[0].variant_type == "insertion"
        assert variants[0].reference_allele == "-"
        assert variants[0].alternate_allele == "G"

    def test_detect_deletion(self) -> None:
        """Detecta una deleción."""
        hit = BlastHit(
            chromosome="chr17",
            start=100,
            end=104,
            identity=75.0,
            evalue=1e-10,
            query_sequence="AT-C",
            subject_sequence="ATGC",  # Deleción de G
            alignment_length=4,
        )
        blast_result = BlastResult(hits=[hit], best_hit=hit, query_length=3)

        variants = variant_detector.detect(blast_result)

        assert len(variants) == 1
        assert variants[0].variant_type == "deletion"
        assert variants[0].reference_allele == "G"
        assert variants[0].alternate_allele == "-"

    def test_no_variants_when_identical(self) -> None:
        """No detecta variantes cuando las secuencias son idénticas."""
        hit = BlastHit(
            chromosome="chr17",
            start=100,
            end=104,
            identity=100.0,
            evalue=1e-50,
            query_sequence="ATGC",
            subject_sequence="ATGC",
            alignment_length=4,
        )
        blast_result = BlastResult(hits=[hit], best_hit=hit, query_length=4)

        variants = variant_detector.detect(blast_result)

        assert len(variants) == 0

    def test_no_variants_without_hits(self) -> None:
        """Retorna lista vacía cuando no hay hits."""
        blast_result = BlastResult(hits=[], best_hit=None, query_length=100)

        variants = variant_detector.detect(blast_result)

        assert len(variants) == 0

    def test_multiple_variants(self) -> None:
        """Detecta múltiples variantes en un alineamiento."""
        hit = BlastHit(
            chromosome="chr17",
            start=100,
            end=110,
            identity=70.0,
            evalue=1e-10,
            query_sequence="ATGCATGCAT",
            subject_sequence="ACGCACGCAT",  # 2 SNPs: T->C en pos 1 y 4
            alignment_length=10,
        )
        blast_result = BlastResult(hits=[hit], best_hit=hit, query_length=10)

        variants = variant_detector.detect(blast_result)

        assert len(variants) == 2
        assert all(v.variant_type == "SNP" for v in variants)
