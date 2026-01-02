"""Tests para el servicio de BLAST."""

import pytest
from unittest.mock import MagicMock, patch

from app.services.blast_service import BlastHit, BlastResult, BlastService


class TestBlastHit:
    """Tests para BlastHit dataclass."""

    def test_extract_chromosome_from_chromosome_word(self) -> None:
        """Extrae cromosoma de título con 'chromosome X'."""
        chrom = BlastHit._extract_chromosome("Homo sapiens chromosome 17, GRCh38")
        assert chrom == "chr17"

    def test_extract_chromosome_from_chr_prefix(self) -> None:
        """Extrae cromosoma de título con 'chrX'."""
        chrom = BlastHit._extract_chromosome("Human chr17 genomic sequence")
        assert chrom == "chr17"

    def test_extract_chromosome_x(self) -> None:
        """Extrae cromosoma X."""
        chrom = BlastHit._extract_chromosome("Homo sapiens chromosome X")
        assert chrom == "chrX"

    def test_extract_chromosome_y(self) -> None:
        """Extrae cromosoma Y."""
        chrom = BlastHit._extract_chromosome("Homo sapiens chromosome Y")
        assert chrom == "chrY"

    def test_extract_chromosome_from_nc_accession(self) -> None:
        """Extrae cromosoma de accession NC_."""
        chrom = BlastHit._extract_chromosome("NC_000017.11 Homo sapiens")
        assert chrom == "chr17"

    def test_extract_chromosome_nc_accession_x(self) -> None:
        """Extrae cromosoma X de accession NC_."""
        chrom = BlastHit._extract_chromosome("NC_000023.11 Homo sapiens")
        assert chrom == "chrX"

    def test_extract_chromosome_nc_accession_y(self) -> None:
        """Extrae cromosoma Y de accession NC_."""
        chrom = BlastHit._extract_chromosome("NC_000024.10 Homo sapiens")
        assert chrom == "chrY"

    def test_extract_chromosome_unknown(self) -> None:
        """Retorna unknown si no puede extraer cromosoma."""
        chrom = BlastHit._extract_chromosome("Some random sequence title")
        assert chrom == "unknown"

    def test_from_hsp(self) -> None:
        """Crea BlastHit desde un HSP."""
        mock_hsp = MagicMock()
        mock_hsp.sbjct_start = 100
        mock_hsp.sbjct_end = 200
        mock_hsp.identities = 95
        mock_hsp.align_length = 100
        mock_hsp.expect = 1e-50
        mock_hsp.query = "ATGC"
        mock_hsp.sbjct = "ATGC"

        hit = BlastHit.from_hsp(mock_hsp, "chromosome 17")

        assert hit.chromosome == "chr17"
        assert hit.start == 100
        assert hit.end == 200
        assert hit.identity == 95.0
        assert hit.evalue == 1e-50
        assert hit.alignment_length == 100


class TestBlastResult:
    """Tests para BlastResult dataclass."""

    def test_has_hits_true(self) -> None:
        """has_hits retorna True cuando hay hits."""
        hit = BlastHit(
            chromosome="chr17",
            start=100,
            end=200,
            identity=95.0,
            evalue=1e-50,
            query_sequence="ATGC",
            subject_sequence="ATGC",
            alignment_length=4,
        )
        result = BlastResult(hits=[hit], best_hit=hit, query_length=100)
        assert result.has_hits is True

    def test_has_hits_false(self) -> None:
        """has_hits retorna False cuando no hay hits."""
        result = BlastResult(hits=[], best_hit=None, query_length=100)
        assert result.has_hits is False


class TestBlastService:
    """Tests para BlastService."""

    @pytest.fixture
    def blast_service(self) -> BlastService:
        """Fixture para BlastService."""
        with patch("app.services.blast_service.settings") as mock_settings:
            mock_settings.ncbi_email = "test@example.com"
            mock_settings.ncbi_api_key = "test_key"
            return BlastService()

    @pytest.mark.asyncio
    async def test_align_requires_email(self) -> None:
        """Lanza error si no hay email configurado."""
        with patch("app.services.blast_service.settings") as mock_settings:
            mock_settings.ncbi_email = None
            mock_settings.ncbi_api_key = None
            service = BlastService()

            with pytest.raises(ValueError, match="NCBI_EMAIL es requerido"):
                await service.align("ATGC")

    @pytest.mark.asyncio
    async def test_align_parses_results(self, blast_service: BlastService) -> None:
        """Parsea resultados de BLAST correctamente."""
        # Mock HSP
        mock_hsp = MagicMock()
        mock_hsp.sbjct_start = 100
        mock_hsp.sbjct_end = 200
        mock_hsp.identities = 95
        mock_hsp.align_length = 100
        mock_hsp.expect = 1e-50
        mock_hsp.query = "ATGC" * 25
        mock_hsp.sbjct = "ATGC" * 25

        # Mock alignment
        mock_alignment = MagicMock()
        mock_alignment.title = "Homo sapiens chromosome 17"
        mock_alignment.hsps = [mock_hsp]

        # Mock blast record
        mock_record = MagicMock()
        mock_record.alignments = [mock_alignment]

        # Mock result handle
        mock_handle = MagicMock()

        with patch("app.services.blast_service.NCBIWWW.qblast", return_value=mock_handle):
            with patch(
                "app.services.blast_service.NCBIXML.read", return_value=mock_record
            ):
                result = await blast_service.align("ATGC" * 25)

        assert result.has_hits
        assert len(result.hits) == 1
        assert result.best_hit is not None
        assert result.best_hit.chromosome == "chr17"

    @pytest.mark.asyncio
    async def test_align_handles_no_hits(self, blast_service: BlastService) -> None:
        """Maneja caso sin hits."""
        mock_record = MagicMock()
        mock_record.alignments = []

        mock_handle = MagicMock()

        with patch("app.services.blast_service.NCBIWWW.qblast", return_value=mock_handle):
            with patch(
                "app.services.blast_service.NCBIXML.read", return_value=mock_record
            ):
                result = await blast_service.align("ATGC")

        assert not result.has_hits
        assert result.best_hit is None
        assert len(result.hits) == 0

    @pytest.mark.asyncio
    async def test_align_sorts_by_evalue(self, blast_service: BlastService) -> None:
        """Ordena hits por e-value."""
        # Mock HSPs con diferentes e-values
        mock_hsp1 = MagicMock()
        mock_hsp1.sbjct_start = 100
        mock_hsp1.sbjct_end = 200
        mock_hsp1.identities = 90
        mock_hsp1.align_length = 100
        mock_hsp1.expect = 1e-10  # Peor
        mock_hsp1.query = "ATGC"
        mock_hsp1.sbjct = "ATGC"

        mock_hsp2 = MagicMock()
        mock_hsp2.sbjct_start = 300
        mock_hsp2.sbjct_end = 400
        mock_hsp2.identities = 95
        mock_hsp2.align_length = 100
        mock_hsp2.expect = 1e-50  # Mejor

        mock_alignment1 = MagicMock()
        mock_alignment1.title = "chromosome 1"
        mock_alignment1.hsps = [mock_hsp1]

        mock_alignment2 = MagicMock()
        mock_alignment2.title = "chromosome 17"
        mock_alignment2.hsps = [mock_hsp2]

        mock_record = MagicMock()
        mock_record.alignments = [mock_alignment1, mock_alignment2]

        mock_handle = MagicMock()

        with patch("app.services.blast_service.NCBIWWW.qblast", return_value=mock_handle):
            with patch(
                "app.services.blast_service.NCBIXML.read", return_value=mock_record
            ):
                result = await blast_service.align("ATGC")

        assert result.best_hit is not None
        assert result.best_hit.evalue == 1e-50
        assert result.best_hit.chromosome == "chr17"
