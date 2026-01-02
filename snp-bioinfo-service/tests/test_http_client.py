"""Tests para el cliente HTTP con retry."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

import httpx

from app.http_client import RateLimiter, HTTPClientManager


class TestRateLimiter:
    """Tests para RateLimiter."""

    def test_init_creates_semaphore(self) -> None:
        """Crea semáforo con valor correcto."""
        limiter = RateLimiter(max_concurrent=5)
        assert limiter._semaphore._value == 5

    @pytest.mark.asyncio
    async def test_acquire_decrements_semaphore(self) -> None:
        """Acquire decrementa el semáforo."""
        limiter = RateLimiter(max_concurrent=2)
        await limiter.acquire()
        assert limiter._semaphore._value == 1

    @pytest.mark.asyncio
    async def test_release_increments_semaphore(self) -> None:
        """Release incrementa el semáforo."""
        limiter = RateLimiter(max_concurrent=2)
        await limiter.acquire()
        limiter.release()
        assert limiter._semaphore._value == 2

    @pytest.mark.asyncio
    async def test_limit_context_manager(self) -> None:
        """Context manager adquiere y libera correctamente."""
        limiter = RateLimiter(max_concurrent=2)

        async with limiter.limit():
            assert limiter._semaphore._value == 1

        assert limiter._semaphore._value == 2

    @pytest.mark.asyncio
    async def test_limit_releases_on_exception(self) -> None:
        """Context manager libera incluso con excepción."""
        limiter = RateLimiter(max_concurrent=2)

        with pytest.raises(ValueError):
            async with limiter.limit():
                raise ValueError("Test error")

        assert limiter._semaphore._value == 2


class TestHTTPClientManager:
    """Tests para HTTPClientManager."""

    @pytest.fixture
    def manager(self) -> HTTPClientManager:
        """Fixture para HTTPClientManager."""
        return HTTPClientManager()

    def test_client_lazy_initialization(self, manager: HTTPClientManager) -> None:
        """Cliente se inicializa lazy."""
        assert manager._client is None
        client = manager.client
        assert client is not None
        assert isinstance(client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_close_closes_client(self, manager: HTTPClientManager) -> None:
        """Close cierra el cliente."""
        _ = manager.client  # Inicializar
        await manager.close()
        assert manager._client is None

    @pytest.mark.asyncio
    async def test_close_handles_none_client(self, manager: HTTPClientManager) -> None:
        """Close maneja cliente None."""
        await manager.close()  # No debería lanzar error

    @pytest.mark.asyncio
    async def test_get_with_retry_success(self, manager: HTTPClientManager) -> None:
        """Retorna response en éxito."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch.object(
            manager.client, "get", new_callable=AsyncMock, return_value=mock_response
        ):
            result = await manager.get_with_retry("https://example.com")

        assert result is not None
        assert result.status_code == 200

    @pytest.mark.asyncio
    async def test_get_with_retry_retries_on_500(
        self, manager: HTTPClientManager
    ) -> None:
        """Reintenta en error 500."""
        fail_response = MagicMock()
        fail_response.status_code = 500

        success_response = MagicMock()
        success_response.status_code = 200

        call_count = 0

        async def mock_get(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return fail_response
            return success_response

        with patch.object(manager.client, "get", side_effect=mock_get):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await manager.get_with_retry(
                    "https://example.com", max_retries=3
                )

        assert result is not None
        assert result.status_code == 200
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_get_with_retry_retries_on_timeout(
        self, manager: HTTPClientManager
    ) -> None:
        """Reintenta en timeout."""
        call_count = 0

        async def mock_get(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise httpx.TimeoutException("Timeout")
            return MagicMock(status_code=200)

        with patch.object(manager.client, "get", side_effect=mock_get):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await manager.get_with_retry(
                    "https://example.com", max_retries=3
                )

        assert result is not None
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_get_with_retry_returns_none_on_http_error(
        self, manager: HTTPClientManager
    ) -> None:
        """Retorna None en error HTTP no recuperable."""
        with patch.object(
            manager.client,
            "get",
            new_callable=AsyncMock,
            side_effect=httpx.HTTPError("Connection failed"),
        ):
            result = await manager.get_with_retry("https://example.com")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_with_retry_returns_none_after_max_retries(
        self, manager: HTTPClientManager
    ) -> None:
        """Retorna None después de agotar reintentos."""
        fail_response = MagicMock()
        fail_response.status_code = 503

        with patch.object(
            manager.client, "get", new_callable=AsyncMock, return_value=fail_response
        ):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                result = await manager.get_with_retry(
                    "https://example.com", max_retries=2
                )

        assert result is None

    @pytest.mark.asyncio
    async def test_get_with_retry_returns_none_on_client_error(
        self, manager: HTTPClientManager
    ) -> None:
        """Retorna None en error 4xx (no reintenta)."""
        error_response = MagicMock()
        error_response.status_code = 404

        with patch.object(
            manager.client, "get", new_callable=AsyncMock, return_value=error_response
        ):
            result = await manager.get_with_retry("https://example.com")

        assert result is None

    @pytest.mark.asyncio
    async def test_ncbi_get_uses_ncbi_limiter(self, manager: HTTPClientManager) -> None:
        """ncbi_get usa el rate limiter de NCBI."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch.object(
            manager, "get_with_retry", new_callable=AsyncMock, return_value=mock_response
        ) as mock_get:
            await manager.ncbi_get("https://ncbi.nlm.nih.gov/api")

            mock_get.assert_called_once()
            call_kwargs = mock_get.call_args[1]
            assert call_kwargs["limiter"] == manager._ncbi_limiter

    @pytest.mark.asyncio
    async def test_ensembl_get_uses_ensembl_limiter(
        self, manager: HTTPClientManager
    ) -> None:
        """ensembl_get usa el rate limiter de Ensembl."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch.object(
            manager, "get_with_retry", new_callable=AsyncMock, return_value=mock_response
        ) as mock_get:
            await manager.ensembl_get("https://rest.ensembl.org/vep")

            mock_get.assert_called_once()
            call_kwargs = mock_get.call_args[1]
            assert call_kwargs["limiter"] == manager._ensembl_limiter

    @pytest.mark.asyncio
    async def test_exponential_backoff(self, manager: HTTPClientManager) -> None:
        """Verifica backoff exponencial."""
        fail_response = MagicMock()
        fail_response.status_code = 429

        sleep_times: list[float] = []

        async def mock_sleep(seconds: float) -> None:
            sleep_times.append(seconds)

        with patch.object(
            manager.client, "get", new_callable=AsyncMock, return_value=fail_response
        ):
            with patch("asyncio.sleep", side_effect=mock_sleep):
                await manager.get_with_retry("https://example.com", max_retries=3)

        # Backoff: 1.0, 2.0, 4.0 (base * 2^attempt)
        assert len(sleep_times) == 3
        assert sleep_times[0] == 1.0
        assert sleep_times[1] == 2.0
        assert sleep_times[2] == 4.0
