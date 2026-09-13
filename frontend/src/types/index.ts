export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  org_id: number;
}

export interface Organization {
  id: number;
  name: string;
  industry: string | null;
  scale: string | null;
  location: string | null;
}

export interface Material {
  id: number;
  name: string;
  code: string;
  unit: string;
  unit_cost: number;
  min_stock_level: number;
  avg_daily_usage: number;
  org_id: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string | null;
  unit_price: number;
  org_id: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  avg_delivery_days: number;
  on_time_delivery_rate: number;
  org_id: number;
}

export interface Customer {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  priority: string;
  org_id: number;
}

export interface InventoryRecord {
  id: number;
  material_id: number;
  quantity: number;
  warehouse: string;
  last_updated: string;
  org_id: number;
  material?: Material;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_amount: number;
  items?: PurchaseOrderItem[];
  supplier?: Supplier;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  material_id: number;
  quantity: number;
  unit_price: number;
  material?: Material;
}

export interface SalesOrder {
  id: number;
  so_number: string;
  customer_id: number;
  status: string;
  order_date: string;
  promised_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_amount: number;
  items?: SalesOrderItem[];
  customer?: Customer;
}

export interface SalesOrderItem {
  id: number;
  sales_order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface RiskAlert {
  id: number;
  risk_type: string;
  severity: string;
  score: number;
  entity_type: string;
  entity_id: number;
  title: string;
  description: string;
  impact_description: string | null;
  recommendation: string | null;
  financial_impact: number | null;
  status: string;
  created_at: string;
}

export interface DashboardSummary {
  total_products: number;
  total_materials: number;
  total_suppliers: number;
  total_customers: number;
  total_inventory_value: number;
  low_stock_count: number;
  open_purchase_orders: number;
  open_sales_orders: number;
  active_risks: number;
  health_score: HealthScore;
}

export interface HealthScore {
  score: number;
  category: string;
  breakdown: Record<string, number>;
  trend: string;
  explanation: string;
}

export interface RecommendationOption {
  title: string;
  description: string;
  estimated_cost: number;
  expected_delay_days: number;
  risk_level: string;
  affected_orders: number;
  confidence: number;
}

export interface ScenarioResult {
  scenario_type: string;
  parameters: Record<string, any>;
  original: Record<string, any>;
  simulated: Record<string, any>;
  deltas: Array<{metric: string; original: number; simulated: number; change: number}>;
  summary: string;
}

export interface UploadPreview {
  filename: string;
  total_rows: number;
  columns: string[];
  preview: Record<string, any>[];
  data_quality: Record<string, any>;
}
