import logging
from typing import Annotated

from balanceteshaters.infra.container import Container
from balanceteshaters.infra.database import Database
from balanceteshaters.model.base import Author
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

authors = dict()


@router.post("/post")
@inject
async def ml_post(
    publication: Post,
    db: Annotated[Database, Depends(Provide[Container.database])],
):
    async with db.get_session() as session, session.begin():
        authors = dict()
        author = await get_or_create_author(
            session, publication.author.name, publication.author.accountHref
        )
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
            post_comment = await create_comment(session, comment)
            post.comments.append(post_comment)
        authors.clear()
        await session.commit()
        post_id = post.id
        return {"post_id": str(post_id)}


async def get_or_create_author(
    session: AsyncSession, name: str, account_href: str
) -> Author:
    if account_href in authors:
        return authors[account_href]
    author = await author_repository.find_author_with_account_href(
        session, account_href
    )
    if not author:
        author = author_repository.create_author(session, name, account_href)
    authors[account_href] = author
    return author


async def create_comment(session: AsyncSession, comment: Comment) -> ModelComment:
    model_comment = comment_repository.create_comment(
        session,
        await get_or_create_author(
            session, comment.author.name, comment.author.accountHref
        ),
        comment.textContent,
        comment.publishedAt,
        comment.scrapedAt,
        comment.screenshotData,
        comment.nbLikes,
    )
    model_comment.replies = (
        [await create_comment(session, c) for c in comment.replies]
        if comment.replies
        else []
    )
    return model_comment
