from alembic import command
from alembic.config import Config

from app.core.config import settings


def main() -> None:
    cfg = Config("alembic.ini")
    # Alembic Config interpolates %; Render passwords may contain that character.
    cfg.set_main_option("sqlalchemy.url", settings.async_database_url.replace("%", "%%"))
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    main()
