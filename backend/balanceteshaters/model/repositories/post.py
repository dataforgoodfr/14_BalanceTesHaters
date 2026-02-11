from datetime import datetime

from balanceteshaters.model.base import Post
from sqlalchemy.ext.asyncio import AsyncSession


def create_post(
    session: AsyncSession,
    url: str,
    published_str: str,
    scraped_at: datetime,
    text_content: str,
    post_id: str,
    social_network: str,
):
    try:
        published_at = datetime.fromisoformat(published_str)
    except ValueError:
        published_at = None
    post = Post(
        url=url,
        published_at=published_at,
        published_at_str=published_str,
        scraped_at=scraped_at,
        text_content=text_content,
        post_id=post_id,
        social_network=social_network,
    )
    session.add(post)
    return post
