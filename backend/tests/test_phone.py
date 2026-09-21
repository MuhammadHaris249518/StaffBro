from fastapi import HTTPException

from app.utils.phone import normalize_pk_phone


def test_normalises_local_mobile() -> None:
    assert normalize_pk_phone("0300 1234567") == "+923001234567"
    assert normalize_pk_phone("03001234567") == "+923001234567"


def test_normalises_plus_92() -> None:
    assert normalize_pk_phone("+923001234567") == "+923001234567"
    assert normalize_pk_phone("923001234567") == "+923001234567"


def test_rejects_short_number() -> None:
    try:
        normalize_pk_phone("123")
    except HTTPException as exc:
        assert exc.status_code == 422
        assert exc.detail["code"] == "INVALID_PHONE"
    else:
        raise AssertionError("expected HTTPException")
