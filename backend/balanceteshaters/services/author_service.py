import logging

from balanceteshaters.infra.database import Database
from balanceteshaters.infra.errors import AppException
from balanceteshaters.infra.settings import Settings
from balanceteshaters.model.repositories.author import create_author


class AuthorServiceException(AppException):
    def __init__(self, error_code: str, status_code: int = 500) -> None:
        super().__init__(
            status_code=status_code, message="AuthService error", error_code=error_code
        )


class AuthorService:
    def __init__(self, db: Database, settings: Settings):
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}",
        )
        self.db = db

    async def create_author(self, name: str, account_href: str):
        async with self.db.get_session() as session, session.begin():
            author = create_author(session, name, account_href)
            await session.flush()
            return author
