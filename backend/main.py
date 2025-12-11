import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import ALLOW_ORIGINS
from routes import (
    auth,
    users,
    dashboard,
    students,
    clusters,
    cluster_playground,
    datasets,
    reports,
)

# Initialize FastAPI app
app = FastAPI(title="FreshGroup API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
routers = [
    auth,
    users,
    dashboard,
    students,
    clusters,
    cluster_playground,
    datasets,
    reports,
]
for module in routers:
    app.include_router(module.router, prefix="/api")


# Root health check route (important for Railway)
@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "FreshGroup API",
        "docs": "/docs",
    }

# Only runs when starting locally (Railway uses Procfile / CMD)
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))  # Railway injects PORT
    uvicorn.run(app, host="0.0.0.0", port=port)
