"""Cliente HTTP reutilizable con retry y rate limiting."""

import asyncio
import structlog
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

import httpx

logger = structlog.get_logger(__name__)

# Timeouts por defecto
DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Retry configuration
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1.0  # segundos
RETRY_STATUS_CODES = {429, 500, 502, 503, 504}


class RateLimiter:
    """Rate limiter simple basado en semáforo."""

    def __init__(self, max_concurrent: int = 5) -> None:
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def acquire(self) -> None:
        await self._semaphore.acquire()

    def release(self) -> None:
        self._semaphore.release()

    @asynccontextmanager
    async def limit(self) -> AsyncGenerator[None, None]:
        await self.acquire()
        try:
            yield
        finally:
            self.release()


class HTTPClientManager:
    """Manager para clientes HTTP con rate limiting y retry."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._ncbi_limiter = RateLimiter(3)  # NCBI: 3 req/s sin API key
        self._ensembl_limiter = RateLimiter(15)  # Ensembl: 15 req/s

    @property
    def client(self) -> httpx.AsyncClient:
        """Obtiene el cliente HTTP (lazy initialization)."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=DEFAULT_TIMEOUT,
                follow_redirects=True,
                headers={
                    "User-Agent": "SNP-Bioinfo-Service/1.0",
                    "Accept": "application/json",
                },
            )
        return self._client

    async def close(self) -> None:
        """Cierra el cliente HTTP."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def get_with_retry(
        self,
        url: str,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        limiter: RateLimiter | None = None,
        max_retries: int = MAX_RETRIES,
    ) -> httpx.Response | None:
        """
        GET request con retry y backoff exponencial.

        Args:
            url: URL a consultar
            params: Query parameters
            headers: Headers adicionales
            limiter: Rate limiter a usar
            max_retries: Número máximo de reintentos

        Returns:
            Response o None si falla después de todos los reintentos
        """
        limiter = limiter or RateLimiter(10)

        for attempt in range(max_retries + 1):
            try:
                async with limiter.limit():
                    response = await self.client.get(
                        url,
                        params=params,
                        headers=headers,
                    )

                    # Si es exitoso, retornar
                    if response.status_code < 400:
                        return response

                    # Si es error de rate limit o servidor, reintentar
                    if response.status_code in RETRY_STATUS_CODES:
                        if attempt < max_retries:
                            wait_time = RETRY_BACKOFF_BASE * (2**attempt)
                            logger.warning(
                                "Request fallido, reintentando",
                                url=url,
                                status=response.status_code,
                                attempt=attempt + 1,
                                wait_seconds=wait_time,
                            )
                            await asyncio.sleep(wait_time)
                            continue

                    # Error no recuperable
                    logger.error(
                        "Request fallido",
                        url=url,
                        status=response.status_code,
                    )
                    return None

            except httpx.TimeoutException:
                if attempt < max_retries:
                    wait_time = RETRY_BACKOFF_BASE * (2**attempt)
                    logger.warning(
                        "Timeout, reintentando",
                        url=url,
                        attempt=attempt + 1,
                        wait_seconds=wait_time,
                    )
                    await asyncio.sleep(wait_time)
                    continue
                logger.error("Timeout después de todos los reintentos", url=url)
                return None

            except httpx.HTTPError as e:
                logger.error("Error HTTP", url=url, error=str(e))
                return None

        return None

    async def ncbi_get(
        self,
        url: str,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response | None:
        """GET request a NCBI con rate limiting apropiado."""
        return await self.get_with_retry(
            url=url,
            params=params,
            limiter=self._ncbi_limiter,
        )

    async def ensembl_get(
        self,
        url: str,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response | None:
        """GET request a Ensembl con rate limiting apropiado."""
        return await self.get_with_retry(
            url=url,
            params=params,
            headers={"Content-Type": "application/json"},
            limiter=self._ensembl_limiter,
        )


# Instancia global
http_client = HTTPClientManager()
