from datetime import datetime

from pydantic import BaseModel


class Author(BaseModel):
    name: str
    accountHref: str


class Comment(BaseModel):
    textContent: str
    publishedAt: datetime
    scrapedAt: datetime
    screenshotData: str
    nbLikes: int
    replies: list["Comment"]


class Post(BaseModel):
    url: str
    publishedAt: datetime
    scrapedAt: datetime
    textContent: str
    postId: str
    socialNetwork: str
    author: Author
    comments: list[Comment]
