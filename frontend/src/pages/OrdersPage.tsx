import React, { useEffect, useState } from 'react';
import { PurchaseOrder, SalesOrder } from '../types';
import { PurchaseOrderApi, SalesOrderApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const OrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'purchase' | 'sales'>('purchase');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, [activeTab]);

  const poColumns: Column<PurchaseOrder>[] = [
    { key: 'po_number', label: 'PO Number', render: (r) => <span className="font-semibold text-blue-600">{r.po_number}</span> },
    { key: 'supplier.name', label: 'Supplier', render: (r) => r.supplier?.name },
    { key: 'order_date', label: 'Order Date', render: (r) => new Date(r.order_date).toLocaleDateString() },
    { key: 'expected_delivery_date', label: 'Expected Delivery', render: (r) => r.expected_delivery_date ? new Date(r.expected_delivery_date).toLocaleDateString() : 'N/A' },
    { key: 'total_amount', label: 'Total Amount', render: (r) => `$${r.total_amount.toLocaleString()}` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
  ];

  const soColumns: Column<SalesOrder>[] = [
    { key: 'so_number', label: 'SO Number', render: (r) => <span className="font-semibold text-blue-600">{r.so_number}</span> },
    { key: 'customer.name', label: 'Customer', render: (r) => r.customer?.name },
    { key: 'order_date', label: 'Order Date', render: (r) => new Date(r.order_date).toLocaleDateString() },
    { key: 'promised_delivery_date', label: 'Promised Delivery', render: (r) => r.promised_delivery_date ? new Date(r.promised_delivery_date).toLocaleDateString() : 'N/A' },
    { key: 'total_amount', label: 'Total Amount', render: (r) => `$${r.total_amount.toLocaleString()}` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
      
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
              Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sales Orders
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <input 
              type="text" 
              placeholder={`Search ${activeTab === 'purchase' ? 'purchase' : 'sales'} orders...`} 
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-64"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Create New Order
            </button>
          </div>
          
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
    </div>
  );
};

export default OrdersPage;
