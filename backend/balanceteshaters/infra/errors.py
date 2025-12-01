from logging import Logger

from fastapi import Request
from fastapi.responses import JSONResponse


def register_exception_handlers(app, logger: Logger):
    @app.exception_handler(AppException)
    async def app_exc_handler(
        request: Request,
        exc: AppException,
    ):
        logger.exception(exc)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "message": exc.message,
            },
        )

    @app.exception_handler(Exception)
    async def exc_handler(
        request: Request,
        exc: Exception,
    ):
        logger.exception(exc)
        return JSONResponse(
            status_code=503,
            content={
                "error": "internal_error",
                "message": exc.message,
            },
        )


class AppException(Exception):
    def __init__(self, message: str, error_code: str, status_code: int) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code
        self.message = message


class DBException(AppException):
    def __init__(self, error_code: str) -> None:
        super().__init__(
            status_code=500, message="Database error", error_code=error_code
        )
