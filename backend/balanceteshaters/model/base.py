from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase


@dataclass
class Base(AsyncAttrs, DeclarativeBase):
    pass
