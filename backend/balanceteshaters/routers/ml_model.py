from datetime import datetime

from pydantic import BaseModel


class Author(BaseModel):
    name: str
    accountHref: str


class Comment(BaseModel):
    author: Author
    textContent: str
    publishedAt: str
    scrapedAt: datetime
    screenshotData: str
    nbLikes: int
    replies: list["Comment"] | None = None


class Post(BaseModel):
    url: str
    publishedAt: str
    scrapedAt: datetime
    textContent: str
    postId: str
    socialNetwork: str
    author: Author
    comments: list[Comment]
