from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import engine, Base
from .routers import auth, projects, seismic, annotations, wells

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Seismic Data Visualization API",
    description="API for 3D seismic data visualization and analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(seismic.router, prefix="/api/v1")
app.include_router(annotations.router, prefix="/api/v1")
app.include_router(wells.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "message": "Seismic Data Visualization API",
        "version": "1.0.0",
        "docs": "/docs"
    }
