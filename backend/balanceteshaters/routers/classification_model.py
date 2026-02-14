from pydantic import BaseModel


class Author(BaseModel):
    name: str
    accountHref: str


class Comment(BaseModel):
    commentId: str
    author: Author
    textContent: str
    replies: list["Comment"] | None = None


class ClassificationJob(BaseModel):
    title: str | None = None
    textContent: str | None = None
    comments: dict[str, Comment] = {}
