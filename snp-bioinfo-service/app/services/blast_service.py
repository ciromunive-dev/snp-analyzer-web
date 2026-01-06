"""Servicio de alineamiento BLAT contra genoma humano GRCh38 usando UCSC."""

import re
import structlog
import httpx
from dataclasses import dataclass
from typing import Self

from app.config import settings

logger = structlog.get_logger(__name__)

# URLs de APIs de UCSC
UCSC_BLAT_URL = "https://genome.ucsc.edu/cgi-bin/hgBlat"
UCSC_API_URL = "https://api.genome.ucsc.edu/getData/sequence"


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
    strand: str = "+"  # Strand del alineamiento
    block_sizes: str = ""  # Tamaños de bloques (para genes con intrones)
    block_starts: str = ""  # Posiciones de inicio de bloques en target

    @classmethod
    def from_blat_array(cls, blat_array: list, fields: list[str], query_seq: str) -> Self:
        """Crea un BlastHit desde resultado de BLAT (formato array).

        BLAT devuelve arrays donde cada índice corresponde a un campo en 'fields':
        fields: ['matches', 'misMatches', ..., 'tName', 'tSize', 'tStart', 'tEnd', ...]
        blat_array: [132, 0, ..., 'chr17', 83257441, 7676236, 7676594, ...]
        """
        # Crear diccionario campo -> valor
        data = dict(zip(fields, blat_array))

        # BLAT devuelve coordenadas 0-based, convertimos a 1-based
        chrom = data.get("tName", "unknown")
        start = int(data.get("tStart", 0)) + 1  # Convertir a 1-based
        end = int(data.get("tEnd", 0))
        strand = data.get("strand", "+")

        # Calcular identidad
        matches = int(data.get("matches", 0))
        mismatches = int(data.get("misMatches", 0))
        total = matches + mismatches
        identity = (matches / total * 100) if total > 0 else 0

        # BLAT usa matches como score, lo convertimos a pseudo e-value (menor es mejor)
        evalue = 1.0 / (matches + 1) if matches > 0 else 1.0

        alignment_length = int(data.get("qSize", len(query_seq)))

        # Guardar información de bloques para reconstruir secuencia de referencia
        block_sizes = data.get("blockSizes", "")
        block_starts = data.get("tStarts", "")

        return cls(
            chromosome=chrom,
            start=start,
            end=end,
            identity=identity,
            evalue=evalue,
            query_sequence=query_seq,
            subject_sequence="",  # Se llenará después
            alignment_length=alignment_length,
            strand=strand,
            block_sizes=block_sizes,
            block_starts=block_starts,
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

        # Agregar API key si está configurada (requerida para acceso programático)
        if settings.ucsc_api_key:
            params["apiKey"] = settings.ucsc_api_key
            logger.debug("Usando UCSC API key para BLAT")
        else:
            logger.warning("UCSC_API_KEY no configurada - BLAT puede fallar con CAPTCHA")

        logger.debug("Llamando a UCSC BLAT", assembly=self.assembly, seq_length=len(clean_seq))

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(UCSC_BLAT_URL, params=params)
            response.raise_for_status()

            # UCSC devuelve text/html incluso para JSON válido
            # Verificamos si el contenido parece ser HTML real (CAPTCHA) o JSON
            text = response.text.strip()
            if text.startswith("<") or "turnstile" in text.lower():
                logger.error("UCSC BLAT devolvió página CAPTCHA")
                raise ValueError("UCSC BLAT requiere API key para acceso programático. Configure UCSC_API_KEY.")

            # Parsear JSON
            data = response.json()

        hits = []
        fields = data.get("fields", [])
        blat_results = data.get("blat", [])

        logger.debug("BLAT resultados recibidos", count=len(blat_results))

        # Encontrar índice de tName en fields para filtrar
        try:
            tname_idx = fields.index("tName")
        except ValueError:
            logger.error("Campo tName no encontrado en respuesta BLAT")
            return []

        for result in blat_results:
            # Filtrar solo cromosomas principales (chr1-22, X, Y)
            chrom = result[tname_idx] if len(result) > tname_idx else ""
            if not re.match(r'^chr(\d+|X|Y)$', chrom):
                continue

            hit = BlastHit.from_blat_array(result, fields, clean_seq)

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

        # Obtener secuencia de referencia para el mejor hit
        if hits:
            hits.sort(key=lambda x: x.evalue)
            best = hits[0]
            ref_seq = await self._get_reference_sequence_from_blocks(best)
            if ref_seq:
                # Actualizar el mejor hit con la secuencia de referencia
                hits[0] = BlastHit(
                    chromosome=best.chromosome,
                    start=best.start,
                    end=best.end,
                    identity=best.identity,
                    evalue=best.evalue,
                    query_sequence=best.query_sequence,
                    subject_sequence=ref_seq,
                    alignment_length=best.alignment_length,
                    strand=best.strand,
                    block_sizes=best.block_sizes,
                    block_starts=best.block_starts,
                )

        return hits

    async def _get_reference_sequence_from_blocks(self, hit: BlastHit) -> str:
        """Obtiene la secuencia de referencia reconstruyendo desde los bloques de BLAT.

        BLAT devuelve alineamientos con múltiples bloques cuando hay intrones.
        Necesitamos concatenar las secuencias de cada bloque.
        """
        # Parsear block_sizes y block_starts
        if not hit.block_sizes or not hit.block_starts:
            # Sin bloques, usar rango simple
            return await self._get_sequence_range(hit.chromosome, hit.start - 1, hit.end)

        try:
            sizes = [int(s) for s in hit.block_sizes.rstrip(",").split(",")]
            starts = [int(s) for s in hit.block_starts.rstrip(",").split(",")]
        except ValueError:
            logger.error("Error parseando bloques BLAT", sizes=hit.block_sizes, starts=hit.block_starts)
            return ""

        logger.debug("Reconstruyendo secuencia desde bloques", num_blocks=len(sizes))

        # Obtener secuencia de cada bloque y concatenar
        ref_parts = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for block_start, block_size in zip(starts, sizes):
                seq = await self._fetch_sequence(client, hit.chromosome, block_start, block_start + block_size)
                if seq:
                    ref_parts.append(seq)

        ref_seq = "".join(ref_parts)

        # Si el strand es negativo, hacer reverse complement
        if hit.strand == "-":
            ref_seq = self._reverse_complement(ref_seq)
            logger.debug("Aplicado reverse complement (strand -)")

        logger.debug("Secuencia de referencia reconstruida", length=len(ref_seq), query_length=len(hit.query_sequence))
        return ref_seq

    async def _fetch_sequence(self, client: httpx.AsyncClient, chrom: str, start: int, end: int) -> str:
        """Obtiene una secuencia del genoma."""
        params = {
            "genome": self.assembly,
            "chrom": chrom,
            "start": start,
            "end": end,
        }
        try:
            response = await client.get(UCSC_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("dna", "").upper()
        except Exception as e:
            logger.error("Error obteniendo secuencia", error=str(e), chrom=chrom, start=start, end=end)
            return ""

    async def _get_sequence_range(self, chrom: str, start: int, end: int) -> str:
        """Obtiene secuencia de un rango simple."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            return await self._fetch_sequence(client, chrom, start, end)

    @staticmethod
    def _reverse_complement(seq: str) -> str:
        """Calcula el reverse complement de una secuencia de ADN."""
        complement = {"A": "T", "T": "A", "G": "C", "C": "G", "N": "N"}
        return "".join(complement.get(base, base) for base in reversed(seq))


# Instancia global (mantiene compatibilidad con imports existentes)
blast_service = BlastService()
