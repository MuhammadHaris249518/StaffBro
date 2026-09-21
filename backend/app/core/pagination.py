from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Keyset pagination envelope used by every list endpoint."""

    items: list[T]
    next_cursor: str | None = None


class PageQuery(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = None
