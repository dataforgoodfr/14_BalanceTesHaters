from balanceteshaters.model.auth import AuthToken
from sqlalchemy import DateTime, select
from sqlalchemy.ext.asyncio import AsyncSession


def create_auth_token(session: AsyncSession, jwt_token: str, expires_at: DateTime):
    token = AuthToken(jwt_token=jwt_token, expires_at=expires_at)
    session.add(token)
    return token


async def find_auth_token_with_user(session: AsyncSession, token: str):
    stmt = select(AuthToken).where(AuthToken.jwt_token == token)
    result = await session.execute(stmt)
    return result.scalars().first()


async def delete_auth_token(session: AsyncSession, auth_token: AuthToken):
    await session.delete(auth_token)
