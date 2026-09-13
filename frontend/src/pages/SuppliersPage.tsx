import React, { useEffect, useState } from 'react';
import { Supplier } from '../types';
import { SupplierApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import KPICard from '../components/KPICard';
import { Truck, CheckCircle, Clock } from 'lucide-react';

const SuppliersPage: React.FC = () => {
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await SupplierApi.getSuppliers();
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch suppliers', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const avgDelivery = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.avg_delivery_days, 0) / data.length).toFixed(1) : '0';
  const avgReliability = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.on_time_delivery_rate, 0) / data.length).toFixed(1) : '0';

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Supplier Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'contact_email', label: 'Contact Email', render: (r) => r.contact_email || 'N/A' },
    { key: 'contact_phone', label: 'Phone', render: (r) => r.contact_phone || 'N/A' },
    { key: 'avg_delivery_days', label: 'Avg Delivery', render: (r) => `${r.avg_delivery_days} days` },
    { key: 'on_time_delivery_rate', label: 'On-Time Rate', render: (r) => (
      <div className="flex items-center space-x-2">
        <div className="w-24 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${r.on_time_delivery_rate >= 90 ? 'bg-green-500' : r.on_time_delivery_rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} 
            style={{ width: `${r.on_time_delivery_rate}%` }}
          ></div>
        </div>
        <span className="text-xs font-medium">{r.on_time_delivery_rate}%</span>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Supplier Network</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Total Suppliers" value={data.length} icon={Truck} />
        <KPICard title="Network Avg Delivery" value={`${avgDelivery} days`} icon={Clock} color="orange" />
        <KPICard title="Network Reliability" value={`${avgReliability}%`} icon={CheckCircle} color="green" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Supplier Directory</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Add Supplier
          </button>
        </div>
        
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading suppliers...</div>
        ) : (
          <DataTable columns={columns} data={data} itemsPerPage={10} />
        )}
      </div>
    </div>
  );
};

export default SuppliersPage;
