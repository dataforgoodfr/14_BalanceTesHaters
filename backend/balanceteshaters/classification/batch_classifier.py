import asyncio
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from balanceteshaters.classification.embedding_classifier import EmbeddingClassifier

logger = logging.getLogger(__name__)


class BatchClassifier:
    """Queues classification requests and processes them in configurable batches.

    Collects concurrent requests and processes them in true batches using the
    model's ability to classify multiple texts in one prompt.
    """

    def __init__(
        self,
        classifier: "EmbeddingClassifier",
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
        # Truncate to budget (n_ctx - safety buffer)
        budget = self.classifier.n_ctx - 300
        truncated_text = self.classifier.truncate(text, budget)
        
        loop = asyncio.get_running_loop()
        future: asyncio.Future[list[str]] = loop.create_future()
        await self._queue.put((truncated_text, future))
        return await future

    async def _batch_loop(self) -> None:
        loop = asyncio.get_running_loop()
        # Strictly manage token budget
        # Budget: n_ctx (2048) - safety margin for instructions and output (approx 448 tokens)
        MAX_TOKEN_BUDGET = self.classifier.n_ctx - 448

        while True:
            first_item = await self._queue.get()
            batch = [first_item]
            current_tokens = self.classifier.count_tokens(first_item[0])
            
            deadline = loop.time() + self.batch_timeout
            
            while len(batch) < self.max_batch_size:
                remaining_time = deadline - loop.time()
                if remaining_time <= 0:
                    break
                try:
                    next_item = await asyncio.wait_for(self._queue.get(), timeout=remaining_time)
                    next_tokens = self.classifier.count_tokens(next_item[0])
                    
                    if current_tokens + next_tokens < MAX_TOKEN_BUDGET:
                        batch.append(next_item)
                        current_tokens += next_tokens
                    else:
                        # Too many tokens, put it back for the next batch
                        await self._queue.put(next_item)
                        break
                except asyncio.TimeoutError:
                    break

            logger.debug("Processing batch of %d items (total tokens: ~%d)", len(batch), current_tokens)
            texts = [text for text, _ in batch]
            futures = [future for _, future in batch]
            try:
                results = await loop.run_in_executor(
                    None, self.classifier.classify_batch, texts
                )
                for future, result in zip(futures, results):
                    if not future.done():
                        future.set_result(result)
            except Exception as exc:
                for future in futures:
                    if not future.done():
                        future.set_exception(exc)
