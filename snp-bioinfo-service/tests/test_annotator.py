"""Tests para el servicio de anotación."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.annotator import Annotator, AnnotatedVariant
from app.services.variant_detector import DetectedVariant


class TestAnnotatedVariant:
    """Tests para AnnotatedVariant dataclass."""

    def test_to_db_format(self) -> None:
        """Convierte correctamente a formato de base de datos."""
        variant = AnnotatedVariant(
            chromosome="chr17",
            position=43092919,
            reference_allele="A",
            alternate_allele="G",
            variant_type="SNP",
            rs_id="rs1800497",
            gene_symbol="BRCA1",
            consequence="missense_variant",
            clinical_significance="pathogenic",
            population_frequency=0.001,
            cadd_score=25.5,
            sift_prediction="deleterious",
            polyphen_prediction="probably_damaging",
        )

        db_format = variant.to_db_format()

        assert db_format["chromosome"] == "chr17"
        assert db_format["referenceAllele"] == "A"
        assert db_format["alternateAllele"] == "G"
        assert db_format["rsId"] == "rs1800497"
        assert db_format["geneSymbol"] == "BRCA1"
        assert db_format["clinicalSignificance"] == "pathogenic"
        assert db_format["caddScore"] == 25.5

    def test_to_db_format_with_nulls(self) -> None:
        """Maneja valores None correctamente."""
        variant = AnnotatedVariant(
            chromosome="chr1",
            position=100,
            reference_allele="A",
            alternate_allele="T",
            variant_type="SNP",
        )

        db_format = variant.to_db_format()

        assert db_format["rsId"] is None
        assert db_format["geneSymbol"] is None
        assert db_format["clinicalSignificance"] is None


class TestAnnotator:
    """Tests para Annotator."""

    @pytest.fixture
    def annotator(self) -> Annotator:
        return Annotator()

    @pytest.fixture
    def sample_variant(self) -> DetectedVariant:
        return DetectedVariant(
            chromosome="chr17",
            position=43092919,
            reference_allele="A",
            alternate_allele="G",
            variant_type="SNP",
        )

    def test_normalize_clinical_significance_pathogenic(
        self, annotator: Annotator
    ) -> None:
        """Normaliza 'Pathogenic' correctamente."""
        result = annotator._normalize_clinical_significance("Pathogenic")
        assert result == "pathogenic"

    def test_normalize_clinical_significance_likely_pathogenic(
        self, annotator: Annotator
    ) -> None:
        """Normaliza 'Likely pathogenic' correctamente."""
        result = annotator._normalize_clinical_significance("Likely pathogenic")
        assert result == "likely_pathogenic"

    def test_normalize_clinical_significance_vus(
        self, annotator: Annotator
    ) -> None:
        """Normaliza 'VUS' correctamente."""
        result = annotator._normalize_clinical_significance("VUS")
        assert result == "uncertain_significance"

    def test_normalize_clinical_significance_benign(
        self, annotator: Annotator
    ) -> None:
        """Normaliza 'Benign' correctamente."""
        result = annotator._normalize_clinical_significance("Benign")
        assert result == "benign"

    def test_normalize_clinical_significance_unknown(
        self, annotator: Annotator
    ) -> None:
        """Maneja valores desconocidos."""
        result = annotator._normalize_clinical_significance("Some Other Value")
        assert result == "some_other_value"

    @pytest.mark.asyncio
    async def test_annotate_all_empty_list(self, annotator: Annotator) -> None:
        """Retorna lista vacía para entrada vacía."""
        result = await annotator.annotate_all([])
        assert result == []

    @pytest.mark.asyncio
    async def test_annotate_all_handles_exceptions(
        self, annotator: Annotator, sample_variant: DetectedVariant
    ) -> None:
        """Crea anotación mínima cuando hay excepciones."""
        with patch.object(
            annotator, "_annotate_single", side_effect=Exception("API Error")
        ):
            results = await annotator.annotate_all([sample_variant])

        assert len(results) == 1
        assert results[0].chromosome == "chr17"
        assert results[0].position == 43092919
        assert results[0].rs_id is None  # Sin anotación

    @pytest.mark.asyncio
    async def test_annotate_single_with_vep_data(
        self, annotator: Annotator, sample_variant: DetectedVariant
    ) -> None:
        """Anota variante con datos de VEP."""
        mock_vep_data = {
            "consequence": "missense_variant",
            "gene_symbol": "BRCA1",
            "rs_id": "rs1800497",
            "sift": "deleterious",
            "polyphen": "probably_damaging",
            "frequency": 0.001,
            "cadd_score": 25.5,
        }

        with patch.object(
            annotator, "_get_vep_annotation", return_value=mock_vep_data
        ):
            with patch.object(annotator, "_lookup_dbsnp", return_value=None):
                with patch.object(annotator, "_get_clinvar", return_value=None):
                    result = await annotator._annotate_single(sample_variant)

        assert result.consequence == "missense_variant"
        assert result.gene_symbol == "BRCA1"
        assert result.rs_id == "rs1800497"
        assert result.sift_prediction == "deleterious"
        assert result.polyphen_prediction == "probably_damaging"
        assert result.population_frequency == 0.001
        assert result.cadd_score == 25.5

    @pytest.mark.asyncio
    async def test_annotate_single_fallback_to_dbsnp(
        self, annotator: Annotator, sample_variant: DetectedVariant
    ) -> None:
        """Busca rsID en dbSNP si VEP no lo proporciona."""
        mock_vep_data = {
            "consequence": "missense_variant",
            "gene_symbol": "BRCA1",
            # Sin rs_id
        }

        with patch.object(
            annotator, "_get_vep_annotation", return_value=mock_vep_data
        ):
            with patch.object(
                annotator, "_lookup_dbsnp", return_value="rs12345"
            ) as mock_dbsnp:
                with patch.object(
                    annotator, "_get_clinvar", return_value="pathogenic"
                ) as mock_clinvar:
                    result = await annotator._annotate_single(sample_variant)

        mock_dbsnp.assert_called_once()
        mock_clinvar.assert_called_once_with("rs12345")
        assert result.rs_id == "rs12345"
        assert result.clinical_significance == "pathogenic"
