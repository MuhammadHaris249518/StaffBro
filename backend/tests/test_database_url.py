from app.core.database_url import database_ssl, normalize_database_url


def test_render_postgres_url_becomes_asyncpg() -> None:
    raw = "postgresql://staffbro:secret@dpg-xxx:5432/staffbro"
    assert normalize_database_url(raw) == "postgresql+asyncpg://staffbro:secret@dpg-xxx:5432/staffbro"


def test_heroku_style_postgres_scheme() -> None:
    raw = "postgres://user:pass@host:5432/db"
    assert normalize_database_url(raw) == "postgresql+asyncpg://user:pass@host:5432/db"


def test_strips_sslmode_query() -> None:
    raw = "postgresql://user:pass@host:5432/db?sslmode=require"
    assert normalize_database_url(raw) == "postgresql+asyncpg://user:pass@host:5432/db"


def test_leaves_asyncpg_url_alone() -> None:
    raw = "postgresql+asyncpg://staffbro:staffbro@localhost:5432/staffbro"
    assert normalize_database_url(raw) == raw


def test_ssl_off_locally() -> None:
    assert database_ssl("postgresql://x", "local") is False


def test_ssl_on_in_staging() -> None:
    assert database_ssl("postgresql://x", "staging") is True


def test_sslmode_disable_wins() -> None:
    assert database_ssl("postgresql://x?sslmode=disable", "staging") is False
