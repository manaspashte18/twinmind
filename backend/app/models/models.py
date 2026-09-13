from sqlalchemy import ForeignKey, String, Float, Boolean, Date, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from typing import List, Optional

from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    industry: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    scale: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default='owner')
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    sku: Mapped[str] = mapped_column(String, unique=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    unit_price: Mapped[float] = mapped_column(Float)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    materials: Mapped[List["ProductMaterial"]] = relationship()
    sales_items: Mapped[List["SalesOrderItem"]] = relationship()

class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    code: Mapped[str] = mapped_column(String, unique=True)
    unit: Mapped[str] = mapped_column(String, default="units")
    unit_cost: Mapped[float] = mapped_column(Float)
    min_stock_level: Mapped[float] = mapped_column(Float, default=0.0)
    avg_daily_usage: Mapped[float] = mapped_column(Float, default=0.0)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    inventory_records: Mapped[List["InventoryRecord"]] = relationship()
    product_materials: Mapped[List["ProductMaterial"]] = relationship()
    supplier_materials: Mapped[List["SupplierMaterial"]] = relationship()
    purchase_items: Mapped[List["PurchaseOrderItem"]] = relationship()

class ProductMaterial(Base):
    __tablename__ = "product_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity_required: Mapped[float] = mapped_column(Float)

class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    avg_delivery_days: Mapped[float] = mapped_column(Float, default=7.0)
    on_time_delivery_rate: Mapped[float] = mapped_column(Float, default=1.0)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    supplier_materials: Mapped[List["SupplierMaterial"]] = relationship()
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship()

class SupplierMaterial(Base):
    __tablename__ = "supplier_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    unit_price: Mapped[float] = mapped_column(Float)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    priority: Mapped[str] = mapped_column(String, default='normal')
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sales_orders: Mapped[List["SalesOrder"]] = relationship()

class InventoryRecord(Base):
    __tablename__ = "inventory_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity: Mapped[float] = mapped_column(Float)
    warehouse: Mapped[str] = mapped_column(String, default="main")
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    po_number: Mapped[str] = mapped_column(String, unique=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    status: Mapped[str] = mapped_column(String, default="pending")
    order_date: Mapped[date] = mapped_column(Date)
    expected_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[List["PurchaseOrderItem"]] = relationship()

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity: Mapped[float] = mapped_column(Float)
    unit_price: Mapped[float] = mapped_column(Float)

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    so_number: Mapped[str] = mapped_column(String, unique=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    status: Mapped[str] = mapped_column(String, default="pending")
    order_date: Mapped[date] = mapped_column(Date)
    promised_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[List["SalesOrderItem"]] = relationship()

class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sales_order_id: Mapped[int] = mapped_column(ForeignKey("sales_orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[float] = mapped_column(Float)
    unit_price: Mapped[float] = mapped_column(Float)

class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    risk_type: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    score: Mapped[float] = mapped_column(Float)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    impact_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    financial_impact: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String, default="critical")
    link: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

