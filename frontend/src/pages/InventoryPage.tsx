import React, { useEffect, useState } from 'react';
import { InventoryRecord } from '../types';
import { InventoryApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import KPICard from '../components/KPICard';
import { Package, AlertTriangle, ArrowDown } from 'lucide-react';

const InventoryPage: React.FC = () => {
  const [data, setData] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await InventoryApi.getInventory();
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch inventory', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalValue = data.reduce((acc, curr) => acc + (curr.quantity * (curr.material?.unit_cost || 0)), 0);
  const criticalItems = data.filter(d => d.quantity <= (d.material?.min_stock_level || 0));

  const columns: Column<InventoryRecord>[] = [
    { key: 'material.code', label: 'Code', render: (r) => <span className="font-medium text-gray-900">{r.material?.code}</span> },
    { key: 'material.name', label: 'Material Name', render: (r) => r.material?.name },
    { key: 'quantity', label: 'Quantity', render: (r) => <span className="font-semibold">{r.quantity} {r.material?.unit}</span> },
    { key: 'min_stock', label: 'Min Stock', render: (r) => `${r.material?.min_stock_level} ${r.material?.unit}` },
    { key: 'value', label: 'Total Value', render: (r) => `$${(r.quantity * (r.material?.unit_cost || 0)).toLocaleString()}` },
    { key: 'status', label: 'Status', render: (r) => {
        const status = r.quantity <= (r.material?.min_stock_level || 0) ? 'critical' : 
                       r.quantity <= (r.material?.min_stock_level || 0) * 1.5 ? 'low' : 'healthy';
        return <StatusBadge status={status} type="inventory" />;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Total Materials" value={data.length} icon={Package} />
        <KPICard title="Total Inventory Value" value={`$${totalValue.toLocaleString()}`} icon={ArrowDown} color="green" />
        <KPICard title="Critical Stock Items" value={criticalItems.length} icon={AlertTriangle} color={criticalItems.length > 0 ? "red" : "green"} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Current Stock Levels</h2>
          <input 
            type="text" 
            placeholder="Search inventory..." 
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-64"
          />
        </div>
        
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading inventory data...</div>
        ) : (
          <DataTable columns={columns} data={data} itemsPerPage={15} />
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
