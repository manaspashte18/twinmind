import React, { useEffect, useState } from 'react';
import { PurchaseOrder, SalesOrder, Supplier, Customer } from '../types';
import { PurchaseOrderApi, SalesOrderApi, SupplierApi, CustomerApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Plus, X } from 'lucide-react';

const OrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'purchase' | 'sales'>('purchase');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const poColumns: Column<PurchaseOrder>[] = [
    { key: 'po_number', label: 'PO Number', render: (r) => <span className="font-mono font-bold text-blue-600">{r.po_number}</span> },
    { key: 'supplier.name', label: 'Supplier', render: (r) => r.supplier?.name || `Supplier #${r.supplier_id}` },
    { key: 'order_date', label: 'Order Date', render: (r) => r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A' },
    { key: 'expected_delivery_date', label: 'Expected Delivery', render: (r) => r.expected_delivery_date ? new Date(r.expected_delivery_date).toLocaleDateString() : 'N/A' },
    { key: 'total_amount', label: 'Total Amount', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
  ];

  const soColumns: Column<SalesOrder>[] = [
    { key: 'so_number', label: 'SO Number', render: (r) => <span className="font-mono font-bold text-blue-600">{r.so_number}</span> },
    { key: 'customer.name', label: 'Customer', render: (r) => r.customer?.name || `Customer #${r.customer_id}` },
    { key: 'order_date', label: 'Order Date', render: (r) => r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A' },
    { key: 'promised_delivery_date', label: 'Promised Delivery', render: (r) => r.promised_delivery_date ? new Date(r.promised_delivery_date).toLocaleDateString() : 'N/A' },
    { key: 'total_amount', label: 'Total Amount', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
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
    </div>
  );
};

export default OrdersPage;
