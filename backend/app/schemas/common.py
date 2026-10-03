from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Generic, TypeVar
import uuid

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

T = TypeVar("T")


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
Money = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
