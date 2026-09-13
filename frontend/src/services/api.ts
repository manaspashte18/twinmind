import axios from 'axios';
import { 
  User, Organization, Material, Product, Supplier, Customer, 
  InventoryRecord, PurchaseOrder, SalesOrder, RiskAlert, 
  DashboardSummary, HealthScore, RecommendationOption, ScenarioResult, UploadPreview,
  SearchResponse, NotificationResponse, NotificationItem
} from '../types';

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const AuthApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get<User>('/auth/me')
};

export const OrgApi = {
  getOrg: () => api.get<Organization>('/organization'),
  updateOrg: (data: any) => api.put<Organization>('/organization', data)
};

export const UploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<UploadPreview>('/upload', formData);
  },
  confirmUpload: (data: any) => api.post('/upload/confirm', data)
};

export const ProductApi = {
  getProducts: () => api.get<Product[]>('/products'),
  createProduct: (data: any) => api.post<Product>('/products', data),
  getProduct: (id: number) => api.get<Product>(`/products/${id}`),
  updateProduct: (id: number, data: any) => api.put<Product>(`/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/products/${id}`)
};

export const MaterialApi = {
  getMaterials: () => api.get<Material[]>('/materials'),
  createMaterial: (data: any) => api.post<Material>('/materials', data),
  getMaterial: (id: number) => api.get<Material>(`/materials/${id}`),
  updateMaterial: (id: number, data: any) => api.put<Material>(`/materials/${id}`, data),
  deleteMaterial: (id: number) => api.delete(`/materials/${id}`)
};

export const SupplierApi = {
  getSuppliers: () => api.get<Supplier[]>('/suppliers'),
  createSupplier: (data: any) => api.post<Supplier>('/suppliers', data),
  getSupplier: (id: number) => api.get<Supplier>(`/suppliers/${id}`),
  updateSupplier: (id: number, data: any) => api.put<Supplier>(`/suppliers/${id}`, data),
  deleteSupplier: (id: number) => api.delete(`/suppliers/${id}`),
  getSupplierPerformance: (id: number) => api.get(`/suppliers/${id}/performance`)
};

export const CustomerApi = {
  getCustomers: () => api.get<Customer[]>('/customers'),
  createCustomer: (data: any) => api.post<Customer>('/customers', data),
  getCustomer: (id: number) => api.get<Customer>(`/customers/${id}`),
  updateCustomer: (id: number, data: any) => api.put<Customer>(`/customers/${id}`, data),
  deleteCustomer: (id: number) => api.delete(`/customers/${id}`)
};

export const InventoryApi = {
  getInventory: () => api.get<InventoryRecord[]>('/inventory'),
  getLowStock: () => api.get<InventoryRecord[]>('/inventory/low-stock'),
  updateInventory: (id: number, data: any) => api.put<InventoryRecord>(`/inventory/${id}`, data),
  getInventorySummary: () => api.get('/inventory/summary')
};

export const PurchaseOrderApi = {
  getPurchaseOrders: () => api.get<PurchaseOrder[]>('/purchase-orders'),
  createPurchaseOrder: (data: any) => api.post<PurchaseOrder>('/purchase-orders', data),
  getPurchaseOrder: (id: number) => api.get<PurchaseOrder>(`/purchase-orders/${id}`),
  updatePurchaseOrder: (id: number, data: any) => api.put<PurchaseOrder>(`/purchase-orders/${id}`, data),
  receivePurchaseOrder: (id: number) => api.post(`/purchase-orders/${id}/receive`)
};

export const SalesOrderApi = {
  getSalesOrders: () => api.get<SalesOrder[]>('/sales-orders'),
  createSalesOrder: (data: any) => api.post<SalesOrder>('/sales-orders', data),
  getSalesOrder: (id: number) => api.get<SalesOrder>(`/sales-orders/${id}`),
  updateSalesOrder: (id: number, data: any) => api.put<SalesOrder>(`/sales-orders/${id}`, data)
};

export const DashboardApi = {
  getDashboardSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getHealthScore: () => api.get<HealthScore>('/dashboard/health-score')
};

export const RiskApi = {
  getRisks: (status?: string) => api.get<RiskAlert[]>(`/risks${status ? `?status=${status}` : ''}`),
  getRisk: (id: number) => api.get<RiskAlert>(`/risks/${id}`),
  acknowledgeRisk: (id: number) => api.put<RiskAlert>(`/risks/${id}/acknowledge`),
  dismissRisk: (id: number) => api.put<RiskAlert>(`/risks/${id}/dismiss`),
  recalculateRisks: () => api.post('/risks/recalculate')
};

export const RecommendationApi = {
  getRecommendations: () => api.get('/recommendations'),
  getRiskOptions: (riskId: number) => api.get<RecommendationOption[]>(`/recommendations/${riskId}/options`),
  approveOption: (riskId: number, optionData: any) => api.post(`/recommendations/${riskId}/approve`, optionData)
};

export const ReportApi = {
  getDailyReport: () => api.get('/reports/daily'),
  exportData: (entity: string) => api.get(`/reports/export?entity_type=${entity}&entity=${entity}`, { responseType: 'blob' })
};

export const SimulatorApi = {
  runScenario: (data: any) => api.post<ScenarioResult>('/simulator/scenario', data)
};

export const SeedApi = {
  seedDatabase: () => api.post('/seed')
};

export const SearchApi = {
  search: (query: string) => api.get<SearchResponse>(`/search?q=${encodeURIComponent(query)}`)
};

export const NotificationApi = {
  getNotifications: () => api.get<NotificationResponse>('/notifications'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  testWebhook: (webhook_url: string) => api.post('/notifications/test-webhook', { webhook_url })
};

export default api;

