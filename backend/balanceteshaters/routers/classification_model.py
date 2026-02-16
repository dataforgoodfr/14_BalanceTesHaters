from pydantic import BaseModel


class Author(BaseModel):
    name: str
    account_href: str


class Comment(BaseModel):
    id: str
    author: Author
    text_content: str
    replies: list["Comment"] = []


class ClassificationJob(BaseModel):
    title: str | None = None
    author: Author
    text_content: str | None = None
    comments: list[Comment] = []
