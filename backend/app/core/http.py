from typing import NoReturn

from fastapi import HTTPException, status


def fail(status_code: int, code: str, message: str) -> NoReturn:
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


def not_found(message: str = "Not found.") -> NoReturn:
    fail(status.HTTP_404_NOT_FOUND, "NOT_FOUND", message)


def forbidden(message: str = "This action is not allowed for your role.") -> NoReturn:
    fail(status.HTTP_403_FORBIDDEN, "FORBIDDEN", message)


def conflict(code: str, message: str) -> NoReturn:
    fail(status.HTTP_409_CONFLICT, code, message)


def unprocessable(code: str, message: str) -> NoReturn:
    fail(status.HTTP_422_UNPROCESSABLE_ENTITY, code, message)
