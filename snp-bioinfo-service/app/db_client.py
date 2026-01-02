"""Cliente de base de datos para Supabase."""

import structlog
from datetime import datetime, timezone
from typing import Any
from supabase import create_client, Client

from app.config import settings

logger = structlog.get_logger(__name__)


class DatabaseClient:
    """Cliente para interactuar con Supabase."""

    def __init__(self) -> None:
        """Inicializa el cliente de Supabase."""
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        """Obtiene el cliente de Supabase (lazy initialization)."""
        if self._client is None:
            if not settings.supabase_url or not settings.supabase_service_key:
                raise ValueError("SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos")
            self._client = create_client(
                settings.supabase_url,
                settings.supabase_service_key,
            )
        return self._client

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        """Obtiene un job por ID."""
        try:
            response = (
                self.client.table("AnalysisJob")
                .select("*")
                .eq("id", job_id)
                .execute()
            )
            if response.data:
                return response.data[0]
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
            now = datetime.now(timezone.utc).isoformat()
            data: dict[str, Any] = {
                "status": status,
                "updatedAt": now,
            }

            if error_message:
                data["errorMessage"] = error_message

            if status == "COMPLETED":
                data["completedAt"] = now

            self.client.table("AnalysisJob").update(data).eq("id", job_id).execute()
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
            now = datetime.now(timezone.utc).isoformat()
            self.client.table("AnalysisJob").update(
                {
                    "blastEvalue": evalue,
                    "blastIdentity": identity,
                    "chromosome": chromosome,
                    "updatedAt": now,
                }
            ).eq("id", job_id).execute()
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
            now = datetime.now(timezone.utc).isoformat()

            # Preparar variantes con jobId y timestamp
            variants_to_insert = []
            for variant in variants:
                variant_data = {
                    **variant,
                    "jobId": job_id,
                    "createdAt": now,
                }
                variants_to_insert.append(variant_data)

            # Insertar en batch
            self.client.table("Variant").insert(variants_to_insert).execute()
            logger.info(
                "Variantes guardadas",
                job_id=job_id,
                count=len(variants_to_insert),
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
