"""Turn a cloud or local Postgres URL into an asyncpg SQLAlchemy URL."""


def normalize_database_url(raw: str) -> str:
    url = raw.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]

    if "?" in url:
        base, query = url.split("?", 1)
        kept = [
            part
            for part in query.split("&")
            if part and part.split("=", 1)[0].lower() != "sslmode"
        ]
        url = base if not kept else f"{base}?{'&'.join(kept)}"
    return url


def database_ssl(raw_url: str, app_env: str) -> bool:
    lower = raw_url.lower()
    if "sslmode=disable" in lower:
        return False
    if app_env == "local":
        return False
    return True
