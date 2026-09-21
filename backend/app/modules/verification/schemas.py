from pydantic import BaseModel, Field


class PhoneStartOut(BaseModel):
    sent: bool = True
    expires_in_seconds: int = 600
    debug_code: str | None = None


class PhoneConfirmIn(BaseModel):
    code: str = Field(min_length=4, max_length=8)


class PhoneConfirmOut(BaseModel):
    phone_verified: bool
