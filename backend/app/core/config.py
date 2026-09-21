from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.database_url import database_ssl, normalize_database_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    app_version: str = "0.2.0"
    database_url: str = "postgresql+asyncpg://staffbro:staffbro@localhost:5432/staffbro"
    cors_origins: str = "http://localhost:5173"
    cors_origin_regex: str | None = None
    internal_tasks_secret: str = "change-me-before-phase-10"
    jwt_secret: str = "dev-only-change-before-any-public-deploy"
    jwt_days: int = 7

    @property
    def async_database_url(self) -> str:
        return normalize_database_url(self.database_url)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def cors_allow_origin_regex(self) -> str | None:
        if self.cors_origin_regex:
            return self.cors_origin_regex
        if self.app_env != "local":
            return r"https://.*\.onrender\.com"
        return None

    @property
    def db_connect_args(self) -> dict:
        args: dict = {"prepared_statement_cache_size": 0}
        args["ssl"] = database_ssl(self.database_url, self.app_env)
        return args


settings = Settings()
