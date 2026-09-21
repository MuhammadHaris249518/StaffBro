import re

from fastapi import HTTPException, status


def normalize_pk_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("92") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+92{digits[1:]}"
    if len(digits) == 10:
        return f"+92{digits}"
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={"code": "INVALID_PHONE", "message": "Use a Pakistan mobile number such as 0300 1234567."},
    )
