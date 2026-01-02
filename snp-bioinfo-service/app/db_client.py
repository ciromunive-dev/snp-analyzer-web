"""Cliente de base de datos para PostgreSQL (Neon)."""

import structlog
from datetime import datetime, timezone
from typing import Any
import asyncpg

from app.config import settings

logger = structlog.get_logger(__name__)


class DatabaseClient:
    """Cliente para interactuar con PostgreSQL/Neon."""

    def __init__(self) -> None:
        """Inicializa el cliente de base de datos."""
        self._pool: asyncpg.Pool | None = None

    async def _get_pool(self) -> asyncpg.Pool:
        """Obtiene el pool de conexiones (lazy initialization)."""
        if self._pool is None:
            if not settings.database_url:
                raise ValueError("DATABASE_URL es requerido")
            self._pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=1,
                max_size=5,
            )
        return self._pool

    async def close(self) -> None:
        """Cierra el pool de conexiones."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        """Obtiene un job por ID."""
        try:
            pool = await self._get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    'SELECT * FROM "AnalysisJob" WHERE id = $1',
                    job_id,
                )
                if row:
                    return dict(row)
                return None
        except Exception as e:
            logger.error("Error obteniendo job", job_id=job_id, error=str(e))
            raise

    async def update_job_status(
        self,
        job_id: str,
        status: str,
        error_message: str | None = None,
    ) -> None:
        """Actualiza el estado de un job."""
        try:
            pool = await self._get_pool()
            now = datetime.now(timezone.utc)

            async with pool.acquire() as conn:
                if status == "COMPLETED":
                    await conn.execute(
                        '''
                        UPDATE "AnalysisJob"
                        SET status = $1, "updatedAt" = $2, "completedAt" = $3, "errorMessage" = $4
                        WHERE id = $5
                        ''',
                        status,
                        now,
                        now,
                        error_message,
                        job_id,
                    )
                else:
                    await conn.execute(
                        '''
                        UPDATE "AnalysisJob"
                        SET status = $1, "updatedAt" = $2, "errorMessage" = $3
                        WHERE id = $4
                        ''',
                        status,
                        now,
                        error_message,
                        job_id,
                    )

            logger.info("Job status actualizado", job_id=job_id, status=status)

        except Exception as e:
            logger.error(
                "Error actualizando job status",
                job_id=job_id,
                status=status,
                error=str(e),
            )
            raise

    async def update_job_blast_results(
        self,
        job_id: str,
        evalue: float,
        identity: float,
        chromosome: str,
    ) -> None:
        """Actualiza los resultados de BLAST en un job."""
        try:
            pool = await self._get_pool()
            now = datetime.now(timezone.utc)

            async with pool.acquire() as conn:
                await conn.execute(
                    '''
                    UPDATE "AnalysisJob"
                    SET "blastEvalue" = $1, "blastIdentity" = $2, chromosome = $3, "updatedAt" = $4
                    WHERE id = $5
                    ''',
                    evalue,
                    identity,
                    chromosome,
                    now,
                    job_id,
                )

            logger.info(
                "Resultados BLAST guardados",
                job_id=job_id,
                chromosome=chromosome,
                identity=identity,
            )

        except Exception as e:
            logger.error(
                "Error guardando resultados BLAST",
                job_id=job_id,
                error=str(e),
            )
            raise

    async def save_variants(
        self,
        job_id: str,
        variants: list[dict[str, Any]],
    ) -> None:
        """Guarda las variantes detectadas."""
        if not variants:
            logger.info("No hay variantes para guardar", job_id=job_id)
            return

        try:
            pool = await self._get_pool()
            now = datetime.now(timezone.utc)

            async with pool.acquire() as conn:
                # Insertar variantes una por una (podría optimizarse con executemany)
                for variant in variants:
                    await conn.execute(
                        '''
                        INSERT INTO "Variant" (
                            "jobId", chromosome, position, "referenceAllele", "alternateAllele",
                            "variantType", "rsId", "hgvsNotation", "geneSymbol", consequence,
                            "clinicalSignificance", "populationFrequency", "revelScore",
                            "caddScore", "siftPrediction", "polyphenPrediction", "createdAt"
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
                        )
                        ''',
                        job_id,
                        variant.get("chromosome"),
                        variant.get("position"),
                        variant.get("referenceAllele"),
                        variant.get("alternateAllele"),
                        variant.get("variantType"),
                        variant.get("rsId"),
                        variant.get("hgvsNotation"),
                        variant.get("geneSymbol"),
                        variant.get("consequence"),
                        variant.get("clinicalSignificance"),
                        variant.get("populationFrequency"),
                        variant.get("revelScore"),
                        variant.get("caddScore"),
                        variant.get("siftPrediction"),
                        variant.get("polyphenPrediction"),
                        now,
                    )

            logger.info(
                "Variantes guardadas",
                job_id=job_id,
                count=len(variants),
            )

        except Exception as e:
            logger.error(
                "Error guardando variantes",
                job_id=job_id,
                error=str(e),
            )
            raise


# Instancia global
db = DatabaseClient()
