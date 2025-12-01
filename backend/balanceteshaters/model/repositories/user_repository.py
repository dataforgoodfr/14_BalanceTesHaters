from balanceteshaters.model.auth import User
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession


async def find_user_by_email(session: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalars().first()


async def find_user_by_login(session: AsyncSession, login: str) -> User | None:
    stmt = select(User).where(User.login == login)
    result = await session.execute(stmt)
    return result.scalars().first()


async def find_user_by_email_or_login(
    session: AsyncSession, email_or_login: str
) -> User | None:
    stmt = select(User).where(
        or_(User.email == email_or_login, User.login == email_or_login)
    )
    result = await session.execute(stmt)
    return result.scalars().first()


def create_user(
    session: AsyncSession,
    email: str,
    login: str,
    display_name: str | None = None,
    enabled: bool = True,
) -> User:
    new_user = User(email=email, login=login, display_name=display_name)
    session.add(new_user)
    return new_user
