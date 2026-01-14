from balanceteshaters.model.base import Author
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def create_author(session: AsyncSession, name: str, account_href: str):
    author = Author(name=name, account_href=account_href)
    session.add(author)
    return author


async def find_author_with_name(session: AsyncSession, name: str) -> Author | None:
    stmt = select(Author).where(Author.name == name)
    result = await session.execute(stmt)
    return result.scalars().first()


async def find_author_with_account_href(
    session: AsyncSession, account_href: str
) -> Author | None:
    stmt = select(Author).where(Author.account_href == account_href)
    result = await session.execute(stmt)
    return result.scalars().first()
