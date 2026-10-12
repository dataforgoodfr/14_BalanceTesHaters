from collections.abc import Awaitable, Callable
from typing import Any

from prometheus_client import Gauge

BACKGROUND_TASKS_IN_PROGRESS = Gauge(
    "bth_backend_classification_background_tasks_in_progress",
    "Number of classification background tasks currently executing",
)


async def track_background_task(
    task: Callable[..., Awaitable[Any]], *args: Any, **kwargs: Any
) -> None:
    BACKGROUND_TASKS_IN_PROGRESS.inc()
    try:
        await task(*args, **kwargs)
    finally:
        BACKGROUND_TASKS_IN_PROGRESS.dec()
