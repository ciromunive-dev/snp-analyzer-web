"""Servicio de anotación funcional de variantes."""

import asyncio
import structlog
from dataclasses import dataclass
from typing import Any

from app.config import settings
from app.http_client import http_client
from app.services.variant_detector import DetectedVariant

logger = structlog.get_logger(__name__)

# URLs de APIs
NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
ENSEMBL_BASE = "https://rest.ensembl.org"


@dataclass
class AnnotatedVariant:
    """Variante con anotación funcional completa."""

    chromosome: str
    position: int
    reference_allele: str
    alternate_allele: str
    variant_type: str
    rs_id: str | None = None
    hgvs_notation: str | None = None
    gene_symbol: str | None = None
    consequence: str | None = None
    clinical_significance: str | None = None
    population_frequency: float | None = None
    revel_score: float | None = None
    cadd_score: float | None = None
    sift_prediction: str | None = None
    polyphen_prediction: str | None = None

    def to_db_format(self) -> dict[str, Any]:
        """Convierte a formato para base de datos (camelCase)."""
        return {
            "chromosome": self.chromosome,
            "position": self.position,
            "referenceAllele": self.reference_allele,
            "alternateAllele": self.alternate_allele,
            "variantType": self.variant_type,
            "rsId": self.rs_id,
            "hgvsNotation": self.hgvs_notation,
            "geneSymbol": self.gene_symbol,
            "consequence": self.consequence,
            "clinicalSignificance": self.clinical_significance,
            "populationFrequency": self.population_frequency,
            "revelScore": self.revel_score,
            "caddScore": self.cadd_score,
            "siftPrediction": self.sift_prediction,
            "polyphenPrediction": self.polyphen_prediction,
        }


class Annotator:
    """Servicio de anotación usando APIs externas."""

    def __init__(self) -> None:
        """Inicializa el anotador."""
        self._semaphore = asyncio.Semaphore(5)  # Max 5 variantes concurrentes

    async def annotate_all(
        self,
        variants: list[DetectedVariant],
    ) -> list[AnnotatedVariant]:
        """
        Anota todas las variantes con información de múltiples fuentes.

        Pipeline de anotación:
        1. Ensembl VEP - consecuencia, gen, SIFT, PolyPhen, frecuencia, CADD
        2. dbSNP - rsID (si VEP no lo proporciona)
        3. ClinVar - significancia clínica (si hay rsID)

        Args:
            variants: Lista de variantes detectadas

        Returns:
            Lista de variantes anotadas
        """
        if not variants:
            return []

        logger.info("Iniciando anotacion", total_variants=len(variants))

        # Procesar en batches para no sobrecargar las APIs
        batch_size = 10
        all_annotated: list[AnnotatedVariant] = []

        for i in range(0, len(variants), batch_size):
            batch = variants[i : i + batch_size]
            tasks = [self._annotate_single(v) for v in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for j, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.warning(
                        "Error anotando variante, usando anotacion minima",
                        variant_index=i + j,
                        error=str(result),
                    )
                    v = batch[j]
                    all_annotated.append(
                        AnnotatedVariant(
                            chromosome=v.chromosome,
                            position=v.position,
                            reference_allele=v.reference_allele,
                            alternate_allele=v.alternate_allele,
                            variant_type=v.variant_type,
                        )
                    )
                else:
                    all_annotated.append(result)

            # Pequeña pausa entre batches para no saturar APIs
            if i + batch_size < len(variants):
                await asyncio.sleep(0.5)

        logger.info(
            "Anotacion completada",
            total_annotated=len(all_annotated),
            with_rsid=sum(1 for v in all_annotated if v.rs_id),
            with_clinical=sum(1 for v in all_annotated if v.clinical_significance),
            with_consequence=sum(1 for v in all_annotated if v.consequence),
            with_cadd=sum(1 for v in all_annotated if v.cadd_score),
        )

        return all_annotated

    async def _annotate_single(
        self,
        variant: DetectedVariant,
    ) -> AnnotatedVariant:
        """Anota una variante individual."""
        async with self._semaphore:
            # Crear variante base
            annotated = AnnotatedVariant(
                chromosome=variant.chromosome,
                position=variant.position,
                reference_allele=variant.reference_allele,
                alternate_allele=variant.alternate_allele,
                variant_type=variant.variant_type,
            )

            # 1. Ensembl VEP - obtiene la mayoría de la información
            vep_data = await self._get_vep_annotation(
                variant.chromosome,
                variant.position,
                variant.reference_allele,
                variant.alternate_allele,
            )

            if vep_data:
                annotated.consequence = vep_data.get("consequence")
                annotated.gene_symbol = vep_data.get("gene_symbol")
                annotated.hgvs_notation = vep_data.get("hgvs")
                annotated.sift_prediction = vep_data.get("sift")
                annotated.polyphen_prediction = vep_data.get("polyphen")
                annotated.population_frequency = vep_data.get("frequency")
                annotated.cadd_score = vep_data.get("cadd_score")

                # VEP también puede dar rsID
                if vep_data.get("rs_id"):
                    annotated.rs_id = vep_data["rs_id"]

            # 2. Si no tenemos rsID de VEP, buscar en dbSNP
            if not annotated.rs_id:
                annotated.rs_id = await self._lookup_dbsnp(
                    variant.chromosome,
                    variant.position,
                )

            # 3. Si tenemos rsID, buscar significancia clínica en ClinVar
            if annotated.rs_id and not annotated.clinical_significance:
                annotated.clinical_significance = await self._get_clinvar(
                    annotated.rs_id
                )

            return annotated

    async def _get_vep_annotation(
        self,
        chrom: str,
        pos: int,
        ref: str,
        alt: str,
    ) -> dict[str, Any] | None:
        """
        Obtiene anotación de Ensembl VEP.

        Incluye: consecuencia, gen, SIFT, PolyPhen, frecuencia, CADD, rsID.
        """
        try:
            chrom_num = chrom.replace("chr", "")

            # Usar VEP region endpoint
            url = f"{ENSEMBL_BASE}/vep/human/region/{chrom_num}:{pos}:{pos}/{alt}"

            response = await http_client.ensembl_get(url)

            if not response or response.status_code != 200:
                return None

            data = response.json()
            if not data:
                return None

            result: dict[str, Any] = {}
            vep_result = data[0]

            # rsID de variantes colocalizadas
            colocated = vep_result.get("colocated_variants", [])
            for cv in colocated:
                if cv.get("id", "").startswith("rs"):
                    result["rs_id"] = cv["id"]
                    break

            # Consecuencia más severa
            if "most_severe_consequence" in vep_result:
                result["consequence"] = vep_result["most_severe_consequence"]

            # Información del transcrito
            transcript_consequences = vep_result.get("transcript_consequences", [])
            if transcript_consequences:
                # Tomar el transcrito canónico o el primero
                tc = next(
                    (t for t in transcript_consequences if t.get("canonical")),
                    transcript_consequences[0],
                )

                result["gene_symbol"] = tc.get("gene_symbol")
                result["hgvs"] = tc.get("hgvsc") or tc.get("hgvsp")

                # Predicciones de patogenicidad
                if "sift_prediction" in tc:
                    result["sift"] = tc["sift_prediction"]
                if "polyphen_prediction" in tc:
                    result["polyphen"] = tc["polyphen_prediction"]

                # CADD score (si está disponible)
                if "cadd_phred" in tc:
                    result["cadd_score"] = float(tc["cadd_phred"])
                elif "cadd_raw" in tc:
                    result["cadd_score"] = float(tc["cadd_raw"])

            # Frecuencia poblacional de gnomAD
            for cv in colocated:
                if "frequencies" in cv:
                    freqs = cv["frequencies"]
                    if alt in freqs:
                        freq_data = freqs[alt]
                        # Preferir gnomAD exomes, luego genomes
                        gnomad_freq = (
                            freq_data.get("gnomade")
                            or freq_data.get("gnomad")
                            or freq_data.get("gnomad_exomes")
                            or freq_data.get("gnomad_genomes")
                        )
                        if gnomad_freq:
                            result["frequency"] = float(gnomad_freq)
                            break

            return result

        except Exception as e:
            logger.debug("Error consultando VEP", error=str(e))
            return None

    async def _lookup_dbsnp(
        self,
        chrom: str,
        pos: int,
    ) -> str | None:
        """Busca rsID en dbSNP por posición."""
        if not settings.ncbi_email:
            return None

        try:
            chrom_num = chrom.replace("chr", "")

            params: dict[str, Any] = {
                "db": "snp",
                "term": f"{chrom_num}[CHR] AND {pos}[CHRPOS]",
                "retmode": "json",
                "email": settings.ncbi_email,
            }

            if settings.ncbi_api_key:
                params["api_key"] = settings.ncbi_api_key

            response = await http_client.ncbi_get(
                f"{NCBI_BASE}/esearch.fcgi",
                params=params,
            )

            if not response:
                return None

            data = response.json()
            id_list = data.get("esearchresult", {}).get("idlist", [])

            if id_list:
                return f"rs{id_list[0]}"

            return None

        except Exception as e:
            logger.debug("Error buscando dbSNP", error=str(e))
            return None

    async def _get_clinvar(self, rs_id: str) -> str | None:
        """Obtiene significancia clínica de ClinVar."""
        if not settings.ncbi_email:
            return None

        try:
            # 1. Buscar en ClinVar
            search_params: dict[str, Any] = {
                "db": "clinvar",
                "term": rs_id,
                "retmode": "json",
                "email": settings.ncbi_email,
            }

            if settings.ncbi_api_key:
                search_params["api_key"] = settings.ncbi_api_key

            response = await http_client.ncbi_get(
                f"{NCBI_BASE}/esearch.fcgi",
                params=search_params,
            )

            if not response:
                return None

            data = response.json()
            id_list = data.get("esearchresult", {}).get("idlist", [])

            if not id_list:
                return None

            # 2. Obtener detalles
            summary_params: dict[str, Any] = {
                "db": "clinvar",
                "id": id_list[0],
                "retmode": "json",
                "email": settings.ncbi_email,
            }

            if settings.ncbi_api_key:
                summary_params["api_key"] = settings.ncbi_api_key

            summary_response = await http_client.ncbi_get(
                f"{NCBI_BASE}/esummary.fcgi",
                params=summary_params,
            )

            if not summary_response:
                return None

            summary_data = summary_response.json()
            result = summary_data.get("result", {})

            if id_list[0] in result:
                entry = result[id_list[0]]

                # La significancia puede estar en diferentes campos
                clinical_sig = entry.get("clinical_significance") or entry.get(
                    "clinicalsignificance"
                )

                if isinstance(clinical_sig, dict):
                    return clinical_sig.get("description", "uncertain_significance")
                elif isinstance(clinical_sig, str):
                    return self._normalize_clinical_significance(clinical_sig)

            return None

        except Exception as e:
            logger.debug("Error consultando ClinVar", error=str(e))
            return None

    def _normalize_clinical_significance(self, sig: str) -> str:
        """Normaliza la significancia clínica a valores estándar."""
        sig_lower = sig.lower().strip()

        # Mapeo a valores estándar (orden importa: más específicos primero)
        mappings = [
            ("likely pathogenic", "likely_pathogenic"),
            ("likely_pathogenic", "likely_pathogenic"),
            ("likely benign", "likely_benign"),
            ("likely_benign", "likely_benign"),
            ("uncertain significance", "uncertain_significance"),
            ("uncertain_significance", "uncertain_significance"),
            ("vus", "uncertain_significance"),
            ("conflicting interpretations", "conflicting_interpretations"),
            ("conflicting", "conflicting_interpretations"),
            ("pathogenic", "pathogenic"),
            ("benign", "benign"),
        ]

        for key, value in mappings:
            if key in sig_lower:
                return value

        return sig_lower.replace(" ", "_")


# Instancia global
annotator = Annotator()
