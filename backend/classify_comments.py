import asyncio
import logging
from datetime import datetime, timezone

from balanceteshaters.infra.container import Container
from balanceteshaters.model.repositories import comment as comment_repository
from sqlalchemy.ext.asyncio import AsyncSession


async def main(db: AsyncSession):
    async with db.get_session() as session, session.begin():
        # Find all comments (including replies) that are not yet classified
        comments = await comment_repository.find_comments_to_classify(session)
        logger.info(f"{len(comments)} comments to classify")

        for comment in comments:
            # Compute and set comment classification here
            # comment.classification = ...
            comment.classified_at = datetime.now(timezone.utc)
        await session.commit()
    logger.info("End classification")


container = Container()
container.logging()

logger = logging.getLogger("classify_comments")
logger.info("Starting comments classification")

container.init_resources()

db = container.database()
asyncio.run(main(db))
