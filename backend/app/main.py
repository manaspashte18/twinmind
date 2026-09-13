from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.config import settings

from app.routers import (
    auth_router, organization_router, upload_router,
    products_router, materials_router, suppliers_router,
    customers_router, inventory_router, purchase_orders_router,
    sales_orders_router, dashboard_router, risks_router,
    recommendations_router, reports_router, simulator_router,
    seed_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="TwinMind Supply Chain Application Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["Auth"])
app.include_router(organization_router, prefix="/api", tags=["Organization"])
app.include_router(upload_router, prefix="/api", tags=["Upload"])
app.include_router(products_router, prefix="/api", tags=["Products"])
app.include_router(materials_router, prefix="/api", tags=["Materials"])
app.include_router(suppliers_router, prefix="/api", tags=["Suppliers"])
app.include_router(customers_router, prefix="/api", tags=["Customers"])
app.include_router(inventory_router, prefix="/api", tags=["Inventory"])
app.include_router(purchase_orders_router, prefix="/api", tags=["Purchase Orders"])
app.include_router(sales_orders_router, prefix="/api", tags=["Sales Orders"])
app.include_router(dashboard_router, prefix="/api", tags=["Dashboard"])
app.include_router(risks_router, prefix="/api", tags=["Risks"])
app.include_router(recommendations_router, prefix="/api", tags=["Recommendations"])
app.include_router(reports_router, prefix="/api", tags=["Reports"])
app.include_router(simulator_router, prefix="/api", tags=["Simulator"])
app.include_router(seed_router, prefix="/api", tags=["Seed"])

@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": "1.0.0"}
