import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PurchaseOrder, SalesOrder, Supplier, Customer } from '../types';
import { PurchaseOrderApi, SalesOrderApi, SupplierApi, CustomerApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Plus, X, Edit2, Check } from 'lucide-react';

const OrdersPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'purchase' | 'sales'>(
    location.pathname === '/sales-orders' ? 'sales' : 'purchase'
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | SalesOrder | null>(null);
  const [editingType, setEditingType] = useState<'purchase' | 'sales'>('purchase');
  const [editStatus, setEditStatus] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');

  // Form State
  const [selectedEntityId, setSelectedEntityId] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (activeTab === 'purchase') {
        const res = await PurchaseOrderApi.getPurchaseOrders();
        setPurchaseOrders(res.data);
      } else {
        const res = await SalesOrderApi.getSalesOrders();
        setSalesOrders(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  useEffect(() => {
    if (location.pathname === '/sales-orders') {
      setActiveTab('sales');
    } else if (location.pathname === '/purchase-orders') {
      setActiveTab('purchase');
    }
  }, [location.pathname]);

  useEffect(() => {
    // Load suppliers and customers for the dropdowns
    SupplierApi.getSuppliers().then(res => setSuppliers(res.data)).catch(() => {});
    CustomerApi.getCustomers().then(res => setCustomers(res.data)).catch(() => {});
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityId || !totalAmount) return;

    try {
      setSubmitting(true);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      if (activeTab === 'purchase') {
        await PurchaseOrderApi.createPurchaseOrder({
          po_number: `PO-${randomNum}`,
          supplier_id: Number(selectedEntityId),
          order_date: orderDate,
          expected_delivery_date: deliveryDate || null,
          total_amount: parseFloat(totalAmount),
          status: 'ordered',
          items: []
        });
      } else {
        await SalesOrderApi.createSalesOrder({
          so_number: `SO-${randomNum}`,
          customer_id: Number(selectedEntityId),
          order_date: orderDate,
          promised_delivery_date: deliveryDate || null,
          total_amount: parseFloat(totalAmount),
          status: 'confirmed',
          items: []
        });
      }
      setShowModal(false);
      setSelectedEntityId('');
      setDeliveryDate('');
      setTotalAmount('');
      await fetchOrders();
    } catch (error) {
      console.error('Failed to create order', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditPO = (po: PurchaseOrder) => {
    setEditingOrder(po);
    setEditingType('purchase');
    setEditStatus(po.status);
    setEditDeliveryDate(po.expected_delivery_date || '');
    setEditTotalAmount(po.total_amount?.toString() || '0');
  };

  const handleOpenEditSO = (so: SalesOrder) => {
    setEditingOrder(so);
    setEditingType('sales');
    setEditStatus(so.status);
    setEditDeliveryDate(so.promised_delivery_date || '');
    setEditTotalAmount(so.total_amount?.toString() || '0');
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      setSubmitting(true);
      if (editingType === 'purchase') {
        await PurchaseOrderApi.updatePurchaseOrder(editingOrder.id, {
          status: editStatus,
          expected_delivery_date: editDeliveryDate || null,
          total_amount: parseFloat(editTotalAmount) || 0
        });
      } else {
        await SalesOrderApi.updateSalesOrder(editingOrder.id, {
          status: editStatus,
          promised_delivery_date: editDeliveryDate || null,
          total_amount: parseFloat(editTotalAmount) || 0
        });
      }
      setEditingOrder(null);
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update order', err);
      alert('Failed to update order.');
    } finally {
      setSubmitting(false);
    }
  };

  const poColumns: Column<PurchaseOrder>[] = [
    { key: 'po_number', label: 'PO Number', render: (r) => <span className="font-mono font-bold text-blue-600">{r.po_number}</span> },
    { key: 'supplier.name', label: 'Supplier', render: (r) => r.supplier?.name || `Supplier #${r.supplier_id}` },
    { key: 'order_date', label: 'Order Date', render: (r) => r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A' },
    { key: 'expected_delivery_date', label: 'Expected Delivery', render: (r) => r.expected_delivery_date ? new Date(r.expected_delivery_date).toLocaleDateString() : 'N/A' },
    { key: 'total_amount', label: 'Total Amount', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditPO(r);
          }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center space-x-1"
          title="Edit purchase order"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      ) 
    }
  ];

  const soColumns: Column<SalesOrder>[] = [
    { key: 'so_number', label: 'SO Number', render: (r) => <span className="font-mono font-bold text-blue-600">{r.so_number}</span> },
    { key: 'customer.name', label: 'Customer', render: (r) => r.customer?.name || `Customer #${r.customer_id}` },
    { key: 'order_date', label: 'Order Date', render: (r) => r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A' },
    { key: 'promised_delivery_date', label: 'Promised Delivery', render: (r) => r.promised_delivery_date ? new Date(r.promised_delivery_date).toLocaleDateString() : 'N/A' },
    { key: 'total_amount', label: 'Total Amount', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditSO(r);
          }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center space-x-1"
          title="Edit sales order"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2 shadow-sm"
        >
          <Plus size={18} />
          <span>{activeTab === 'purchase' ? 'Create Purchase Order' : 'Create Sales Order'}</span>
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6">
            <button
              onClick={() => setActiveTab('purchase')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'purchase'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sales Orders ({salesOrders.length})
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading orders...</div>
          ) : (
            activeTab === 'purchase' ? (
              <DataTable columns={poColumns} data={purchaseOrders} itemsPerPage={10} />
            ) : (
              <DataTable columns={soColumns} data={salesOrders} itemsPerPage={10} />
            )
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {activeTab === 'purchase' ? 'New Purchase Order' : 'New Sales Order'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'purchase' ? 'Select Supplier' : 'Select Customer'}
                </label>
                <select
                  required
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose an option...</option>
                  {activeTab === 'purchase'
                    ? suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    : customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.priority})</option>)
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'purchase' ? 'Expected Delivery Date' : 'Promised Delivery Date'}
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Order Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 150000.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Edit {editingType === 'purchase' ? 'Purchase Order' : 'Sales Order'}
                </h3>
                <p className="text-xs text-blue-600 font-mono font-semibold mt-0.5">
                  {'po_number' in editingOrder ? editingOrder.po_number : editingOrder.so_number}
                </p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEditOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 font-medium capitalize"
                >
                  {editingType === 'purchase' ? (
                    <>
                      <option value="pending">Pending</option>
                      <option value="ordered">Ordered</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_production">In Production</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingType === 'purchase' ? 'Expected Delivery Date' : 'Promised Delivery Date'}
                </label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Order Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editTotalAmount}
                  onChange={(e) => setEditTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Check size={16} />
                  <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
