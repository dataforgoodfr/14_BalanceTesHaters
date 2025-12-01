import logging
from contextlib import asynccontextmanager

from balanceteshaters.infra.errors import DBException
from sqlalchemy import exc
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine


class Database:
    def __init__(self, db_dsn: str, db_echo: bool):
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}",
        )
        self._engine = create_async_engine(str(db_dsn), echo=db_echo)
        self._async_session_factory = async_sessionmaker(
            bind=self._engine, autocommit=False, expire_on_commit=False, autoflush=False
        )

    @asynccontextmanager
    async def get_session(self):
        async with self._async_session_factory() as session:
            try:
                yield session
            except exc.IntegrityError as e:
                await session.rollback()
                self.logger.exception(e.orig.args[0], exc_info=True)
                raise DBException(error_code="database_integrity_error") from e
            except exc.DataError as e:
                await session.rollback()
                self.logger.exception(e.orig.args[0], exc_info=True)
                raise DBException(error_code="database_data_error") from e
            except exc.ProgrammingError as e:
                await session.rollback()
                self.logger.exception(e.orig.args[0], exc_info=True)
                raise DBException(error_code="database_programming_error") from e
            except Exception:
                self.logger.exception(
                    "Session rollback, exception in cause", exc_info=True
                )
                await session.rollback()
                raise
            finally:
                await session.close()
