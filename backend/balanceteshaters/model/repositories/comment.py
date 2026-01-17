from datetime import datetime

from balanceteshaters.model.base import Author, Comment
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def create_comment(
    session: AsyncSession,
    author: Author,
    text_content: str,
    published_at: datetime,
    scraped_at: datetime,
    screenshot_data: str,
    nb_likes: int,
):
    comment = Comment(
        text_content=text_content,
        published_at=published_at,
        scraped_at=scraped_at,
        screenshot_data=screenshot_data,
        nb_likes=nb_likes,
        author=author,
    )
    session.add(comment)
    return comment


async def find_comments_to_classify(
    session: AsyncSession,
) -> list[Comment]:
    stmt = select(Comment).where(Comment.classified_at.is_(None))
    result = await session.execute(stmt)
    return result.scalars().all()
