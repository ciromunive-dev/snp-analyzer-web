"""Worker para procesar jobs de análisis de SNP."""

import asyncio
import os
import signal
import sys
import threading
import structlog
import uvicorn

from upstash_redis import Redis

from app.config import settings
from app.db_client import db
from app.services.blast_service import blast_service
from app.services.variant_detector import variant_detector
from app.services.annotator import annotator

# Configurar logging estructurado
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class Worker:
    """Worker que procesa jobs de la cola Redis."""

    def __init__(self) -> None:
        """Inicializa el worker."""
        self.running = True
        self._redis: Redis | None = None

    @property
    def redis(self) -> Redis:
        """Cliente Redis (lazy initialization)."""
        if self._redis is None:
            if not settings.upstash_redis_rest_url or not settings.upstash_redis_rest_token:
                raise ValueError("UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN son requeridos")
            self._redis = Redis(
                url=settings.upstash_redis_rest_url,
                token=settings.upstash_redis_rest_token,
            )
        return self._redis

    def stop(self) -> None:
        """Detiene el worker gracefully."""
        logger.info("Recibida señal de parada, finalizando...")
        self.running = False

    async def run(self) -> None:
        """Loop principal del worker."""
        logger.info(
            "Worker iniciado",
            queue=settings.queue_name,
            poll_interval=settings.worker_sleep_interval,
        )

        while self.running:
            try:
                # Pop de la cola (RPOP para FIFO)
                job_id = self.redis.rpop(settings.queue_name)

                if job_id:
                    # Decodificar si es bytes
                    if isinstance(job_id, bytes):
                        job_id = job_id.decode("utf-8")

                    logger.info("Job recibido", job_id=job_id)
                    await self.process_job(job_id)
                else:
                    # No hay jobs, esperar
                    await asyncio.sleep(settings.worker_sleep_interval)

            except Exception as e:
                logger.error("Error en worker loop", error=str(e))
                await asyncio.sleep(5)

        logger.info("Worker finalizado")

    async def process_job(self, job_id: str) -> None:
        """
        Procesa un job individual.

        Pipeline:
        1. Obtener job de DB
        2. Actualizar estado a PROCESSING
        3. Ejecutar BLAST
        4. Detectar variantes
        5. Anotar variantes
        6. Guardar resultados
        7. Marcar como COMPLETED
        """
        try:
            # 1. Obtener job de la base de datos
            job = await db.get_job(job_id)
            if not job:
                logger.error("Job no encontrado", job_id=job_id)
                return

            # 2. Actualizar estado a PROCESSING
            await db.update_job_status(job_id, "PROCESSING")
            logger.info("Procesando job", job_id=job_id, sequence_name=job.get("sequenceName"))

            # 3. Ejecutar BLAST
            logger.info("Ejecutando BLAST...", job_id=job_id)
            sequence = job["sequence"]
            blast_result = await blast_service.align(sequence)

            if not blast_result.has_hits:
                await db.update_job_status(
                    job_id,
                    "FAILED",
                    "No se encontraron alineamientos significativos. "
                    "Verifica que la secuencia sea de Homo sapiens.",
                )
                return

            # Guardar resultados de BLAST
            best_hit = blast_result.best_hit
            await db.update_job_blast_results(
                job_id,
                best_hit.evalue,
                best_hit.identity,
                best_hit.chromosome,
            )

            # 4. Detectar variantes
            logger.info("Detectando variantes...", job_id=job_id)
            variants = variant_detector.detect(blast_result)
            logger.info("Variantes detectadas", job_id=job_id, count=len(variants))

            # 5. Anotar variantes
            if variants:
                logger.info("Anotando variantes...", job_id=job_id)
                annotated_variants = await annotator.annotate_all(variants)

                # 6. Guardar variantes en base de datos
                db_variants = [v.to_db_format() for v in annotated_variants]
                await db.save_variants(job_id, db_variants)

            # 7. Marcar como completado
            await db.update_job_status(job_id, "COMPLETED")
            logger.info(
                "Job completado exitosamente",
                job_id=job_id,
                variants_found=len(variants) if variants else 0,
            )

        except Exception as e:
            logger.error("Error procesando job", job_id=job_id, error=str(e))
            await db.update_job_status(job_id, "FAILED", str(e))


def run_health_server() -> None:
    """Ejecuta el servidor FastAPI para health checks en un thread separado."""
    from app.main import app

    port = int(os.environ.get("PORT", 8000))
    logger.info("Iniciando servidor de health checks", port=port)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="warning",
    )


async def main() -> None:
    """Punto de entrada principal."""
    # Iniciar servidor HTTP para health checks en thread separado
    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()

    worker = Worker()

    # Manejar señales de terminación
    loop = asyncio.get_event_loop()

    def signal_handler() -> None:
        worker.stop()

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            # Windows no soporta add_signal_handler
            signal.signal(sig, lambda s, f: signal_handler())

    await worker.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker interrumpido por usuario")
        sys.exit(0)
