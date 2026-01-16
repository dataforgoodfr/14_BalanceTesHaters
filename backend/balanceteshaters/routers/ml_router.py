import logging
from typing import Annotated

from balanceteshaters.infra.container import Container
from balanceteshaters.infra.database import Database
from balanceteshaters.model.base import Comment as ModelComment
from balanceteshaters.model.repositories import author as author_repository
from balanceteshaters.model.repositories import comment as comment_repository
from balanceteshaters.model.repositories import post as post_repository
from balanceteshaters.routers.ml_model import Comment, Post
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

logger = logging.getLogger(
    f"{__name__}",
)


@router.post("/post")
@inject
async def ml_post(
    publication: Post,
    db: Annotated[Database, Depends(Provide[Container.database])],
):
    async with db.get_session() as session, session.begin():
        author = await author_repository.find_author_with_account_href(
            session, publication.author.accountHref
        )
        if not author:
            author = author_repository.create_author(
                session, publication.author.name, publication.author.accountHref
            )
            await session.flush()
        post = post_repository.create_post(
            session,
            publication.url,
            publication.publishedAt,
            publication.scrapedAt,
            publication.textContent,
            publication.postId,
            publication.socialNetwork,
        )
        post.author = author
        for comment in publication.comments:
            post_comment = create_comment(session, comment)
            post.comments.append(post_comment)
        await session.commit()
        post_id = post.id
        return {"post_id": str(post_id)}
        return


def create_comment(session: AsyncSession, comment: Comment) -> ModelComment:
    model_comment = comment_repository.create_comment(
        session,
        comment.textContent,
        comment.publishedAt,
        comment.scrapedAt,
        comment.screenshotData,
        comment.nbLikes,
    )
    model_comment.replies = (
        [create_comment(session, c) for c in comment.replies] if comment.replies else []
    )
    return model_comment
