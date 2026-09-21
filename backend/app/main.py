import uuid

from fastapi import APIRouter, Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.db import get_db
from app.core.errors import http_exception_handler, validation_exception_handler
from app.core.logging import configure_logging
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.businesses.router import router as businesses_router
from app.modules.candidacies.router import router as candidacies_router
from app.modules.catalog.router import router as catalog_router
from app.modules.files.router import router as files_router
from app.modules.jobs.router import router as jobs_router
from app.modules.notifications.router import router as notifications_router
from app.modules.reports.router import router as reports_router
from app.modules.verification.router import router as verification_router
from app.modules.workers.router import router as workers_router

configure_logging()

app = FastAPI(
    title="Staffbro API",
    version=settings.app_version,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["HTTPBearer"] = {
        "type": "http",
        "scheme": "bearer",
    }
    schema["security"] = [{"HTTPBearer": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi  # type: ignore[method-assign]


@app.get("/health", tags=["Monitoring"])
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(text("SELECT 1"))
    return {"status": "ok", "db": "ok"}


@app.get("/version", tags=["Monitoring"])
async def version() -> dict:
    return {"version": settings.app_version, "env": settings.app_env}


api = APIRouter(prefix="/api/v1")
api.include_router(catalog_router)
api.include_router(auth_router, prefix="/auth", tags=["Auth"])
api.include_router(workers_router, prefix="/workers", tags=["Workers"])
api.include_router(businesses_router, prefix="/businesses", tags=["Businesses"])
api.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])
api.include_router(candidacies_router, prefix="/candidacies", tags=["Candidacies"])
api.include_router(verification_router, prefix="/verification", tags=["Verification"])
api.include_router(admin_router, prefix="/admin", tags=["Admin"])
api.include_router(files_router, prefix="/files", tags=["Files"])
api.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api.include_router(reports_router, prefix="/reports", tags=["Reports"])
app.include_router(api)


@app.get("/share/jobs/{job_id}", tags=["Share"], response_class=HTMLResponse)
async def share_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> HTMLResponse:
    from app.modules.jobs.service import get_job, share_html

    job = await get_job(db, job_id)
    return HTMLResponse(share_html(job))
