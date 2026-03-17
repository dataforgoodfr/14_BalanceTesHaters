import asyncio
import logging

from balanceteshaters.classification.slm_classifier import SLMClassifier

logger = logging.getLogger(__name__)


class BatchClassifier:
    """Queues classification requests and processes them in configurable batches.

    Collects concurrent requests (from multiple jobs or API calls) and
    processes them sequentially.  llama.cpp reuses the KV cache for the
    shared system-prompt prefix, so sequential processing within a batch
    is already efficient.  The batching controls throughput and prevents
    resource contention on a shared host.
    """

    def __init__(
        self,
        classifier: SLMClassifier,
        max_batch_size: int = 16,
        batch_timeout_s: float = 0.5,
    ):
        self.classifier = classifier
        self.max_batch_size = max_batch_size
        self.batch_timeout = batch_timeout_s
        self._queue: asyncio.Queue[tuple[str, asyncio.Future[list[str]]]] = (
            asyncio.Queue()
        )
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._batch_loop())
            logger.info(
                "BatchClassifier started (max_batch=%d, timeout=%.2fs)",
                self.max_batch_size,
                self.batch_timeout,
            )

    async def stop(self) -> None:
        if self._task is not None and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("BatchClassifier stopped")

    async def classify(self, text: str) -> list[str]:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[list[str]] = loop.create_future()
        await self._queue.put((text, future))
        return await future

    async def _batch_loop(self) -> None:
        loop = asyncio.get_running_loop()
        while True:
            first_item = await self._queue.get()
            batch: list[tuple[str, asyncio.Future[list[str]]]] = [first_item]

            deadline = loop.time() + self.batch_timeout
            while len(batch) < self.max_batch_size:
                remaining = deadline - loop.time()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(
                        self._queue.get(), timeout=remaining
                    )
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            logger.debug("Processing batch of %d items", len(batch))
            for text, future in batch:
                try:
                    result = await loop.run_in_executor(
                        None, self.classifier.classify, text
                    )
                    future.set_result(result)
                except Exception as exc:
                    future.set_exception(exc)
