import asyncio
import socket
from logging.config import fileConfig

from alembic import context
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.db import Base
from app.modules.admin import models as admin_models  # noqa: F401
from app.modules.auth import models as auth_models  # noqa: F401
from app.modules.businesses import models as businesses_models  # noqa: F401
from app.modules.candidacies import models as candidacies_models  # noqa: F401
from app.modules.catalog import models as catalog_models  # noqa: F401
from app.modules.jobs import models as jobs_models  # noqa: F401
from app.modules.notifications import models as notifications_models  # noqa: F401
from app.modules.reports import models as reports_models  # noqa: F401
from app.modules.verification import models as verification_models  # noqa: F401
from app.modules.workers import models as workers_models  # noqa: F401

LOCK_KEY = 8_741_201
RETRYABLE = (OSError, socket.gaierror, OperationalError, TimeoutError, ConnectionError)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = settings.async_database_url
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:  # noqa: ANN001
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(
        settings.async_database_url,
        pool_pre_ping=True,
        connect_args=settings.db_connect_args,
    )
    last_error: BaseException | None = None
    for attempt in range(1, 31):
        try:
            async with engine.connect() as connection:
                await connection.execute(text(f"SELECT pg_advisory_lock({LOCK_KEY})"))
                await connection.commit()
                try:
                    await connection.run_sync(do_run_migrations)
                    await connection.commit()
                except Exception:
                    await connection.rollback()
                    raise
                finally:
                    await connection.execute(text(f"SELECT pg_advisory_unlock({LOCK_KEY})"))
                    await connection.commit()
            await engine.dispose()
            return
        except RETRYABLE as exc:
            last_error = exc
            print(f"database not ready ({attempt}/30): {exc}", flush=True)
            await asyncio.sleep(2)
    await engine.dispose()
    raise RuntimeError("could not connect to postgres") from last_error


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
