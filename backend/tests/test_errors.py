from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import error_body, http_exception_handler, validation_exception_handler


def test_error_envelope_shape() -> None:
    body = error_body("PHONE_TAKEN", "Already registered", [{"field": "phone"}])
    assert body == {
        "error": {"code": "PHONE_TAKEN", "message": "Already registered", "details": [{"field": "phone"}]}
    }


async def test_http_handler_uses_envelope() -> None:
    response = await http_exception_handler(None, StarletteHTTPException(status_code=404, detail="missing"))  # type: ignore[arg-type]
    assert response.status_code == 404
    assert response.body
    assert b"HTTP_ERROR" in response.body


async def test_validation_handler_uses_envelope() -> None:
    exc = RequestValidationError([{"loc": ("query", "limit"), "msg": "x", "type": "value_error"}])
    response = await validation_exception_handler(None, exc)  # type: ignore[arg-type]
    assert response.status_code == 422
    assert b"VALIDATION_ERROR" in response.body
