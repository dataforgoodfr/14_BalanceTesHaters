from datetime import datetime

from balanceteshaters.model.base import Comment
from sqlalchemy.ext.asyncio import AsyncSession


def create_comment(
    session: AsyncSession,
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
    )
    session.add(comment)
    return comment
