from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any, Generic, TypeVar
from datetime import datetime, date

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
    org_id: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    org_name: str
    industry: Optional[str] = None

# Base Schemas

class OrganizationBase(BaseModel):
    name: str
    industry: Optional[str] = None
    scale: Optional[str] = None
    location: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    scale: Optional[str] = None
    location: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: str
    name: str
    role: str = 'owner'

class UserCreate(UserBase):
    password_hash: str
    org_id: int

class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    org_id: int
    created_at: datetime
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class ProductBase(BaseModel):
    name: str
    sku: str
    category: Optional[str] = None
    unit_price: float

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit_price: Optional[float] = None

class ProductResponse(ProductBase):
    id: int
    org_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MaterialBase(BaseModel):
    name: str
    code: str
    unit: str = "units"
    unit_cost: float
    min_stock_level: float = 0.0
    avg_daily_usage: float = 0.0

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    min_stock_level: Optional[float] = None
    avg_daily_usage: Optional[float] = None

class MaterialResponse(MaterialBase):
    id: int
    org_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProductMaterialBase(BaseModel):
    product_id: int
    material_id: int
    quantity_required: float

class ProductMaterialCreate(ProductMaterialBase):
    pass

class ProductMaterialUpdate(BaseModel):
    quantity_required: Optional[float] = None

class ProductMaterialResponse(ProductMaterialBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SupplierBase(BaseModel):
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    avg_delivery_days: float = 7.0
    on_time_delivery_rate: float = 1.0

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    avg_delivery_days: Optional[float] = None
    on_time_delivery_rate: Optional[float] = None

class SupplierResponse(SupplierBase):
    id: int
    org_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SupplierMaterialBase(BaseModel):
    supplier_id: int
    material_id: int
    unit_price: float
    is_primary: bool = False

class SupplierMaterialCreate(SupplierMaterialBase):
    pass

class SupplierMaterialUpdate(BaseModel):
    unit_price: Optional[float] = None
    is_primary: Optional[bool] = None

class SupplierMaterialResponse(SupplierMaterialBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CustomerBase(BaseModel):
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    priority: str = "normal"

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    priority: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: int
    org_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InventoryRecordBase(BaseModel):
    material_id: int
    quantity: float
    warehouse: str = "main"

class InventoryRecordCreate(InventoryRecordBase):
    pass

class InventoryRecordUpdate(BaseModel):
    quantity: Optional[float] = None
    warehouse: Optional[str] = None

class InventoryRecordResponse(InventoryRecordBase):
    id: int
    last_updated: datetime
    org_id: int
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderBase(BaseModel):
    po_number: str
    supplier_id: int
    status: str = "pending"
    order_date: date
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    total_amount: float = 0.0

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    total_amount: Optional[float] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    org_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderItemBase(BaseModel):
    purchase_order_id: int
    material_id: int
    quantity: float
    unit_price: float

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemUpdate(BaseModel):
    quantity: Optional[float] = None
    unit_price: Optional[float] = None

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SalesOrderBase(BaseModel):
    so_number: str
    customer_id: int
    status: str = "pending"
    order_date: date
    promised_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    total_amount: float = 0.0

class SalesOrderCreate(SalesOrderBase):
    pass

class SalesOrderUpdate(BaseModel):
    status: Optional[str] = None
    promised_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    total_amount: Optional[float] = None

class SalesOrderResponse(SalesOrderBase):
    id: int
    org_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SalesOrderItemBase(BaseModel):
    sales_order_id: int
    product_id: int
    quantity: float
    unit_price: float

class SalesOrderItemCreate(SalesOrderItemBase):
    pass

class SalesOrderItemUpdate(BaseModel):
    quantity: Optional[float] = None
    unit_price: Optional[float] = None

class SalesOrderItemResponse(SalesOrderItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class RiskAlertBase(BaseModel):
    risk_type: str
    severity: str
    score: float
    entity_type: str
    entity_id: int
    title: str
    description: str
    impact_description: Optional[str] = None
    recommendation: Optional[str] = None
    financial_impact: Optional[float] = None
    status: str = "active"

class RiskAlertCreate(RiskAlertBase):
    pass

class RiskAlertUpdate(BaseModel):
    status: Optional[str] = None
    resolved_at: Optional[datetime] = None

class RiskAlertResponse(RiskAlertBase):
    id: int
    org_id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AuditLogBase(BaseModel):
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogUpdate(BaseModel):
    pass

class AuditLogResponse(AuditLogBase):
    id: int
    org_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Custom Models for Dashboard and Recommendations
class DashboardSummary(BaseModel):
    total_products: int
    total_materials: int
    total_suppliers: int
    total_customers: int
    total_inventory_value: float
    low_stock_count: int
    open_purchase_orders: int
    open_sales_orders: int
    active_risks: int
    health_score: float
    health_breakdown: Dict[str, Any]

class HealthScore(BaseModel):
    score: float
    category: str
    breakdown: Dict[str, Any]
    trend: str
    explanation: str

class ScenarioRequest(BaseModel):
    scenario_type: str
    parameters: Dict[str, Any]

class ScenarioResult(BaseModel):
    original: Dict[str, Any]
    simulated: Dict[str, Any]
    deltas: List[Dict[str, Any]]
    summary: str

class UploadPreview(BaseModel):
    filename: str
    total_rows: int
    columns: List[str]
    preview: List[Dict[str, Any]]
    data_quality: Dict[str, Any]

class RecommendationOption(BaseModel):
    title: str
    description: str
    estimated_cost: float
    expected_delay_days: float
    risk_level: str
    affected_orders: int
    confidence: float
