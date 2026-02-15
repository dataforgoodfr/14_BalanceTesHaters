from pydantic import BaseModel


class Author(BaseModel):
    name: str
    account_href: str


class Comment(BaseModel):
    author: Author
    text_content: str
    replies: dict[str, "Comment"] = {}


class ClassificationJob(BaseModel):
    title: str | None = None
    author: Author
    text_content: str | None = None
    comments: dict[str, Comment] = {}
