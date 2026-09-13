import React, { useEffect, useState } from 'react';
import { InventoryRecord } from '../types';
import { InventoryApi, MaterialApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import KPICard from '../components/KPICard';
import { Package, AlertTriangle, ArrowDown, Plus, X, Edit2, Check } from 'lucide-react';

const InventoryPage: React.FC = () => {
  const [data, setData] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingRecord, setEditingRecord] = useState<InventoryRecord | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editUnitCost, setEditUnitCost] = useState('');
  const [editAvgUsage, setEditAvgUsage] = useState('');
  const [editName, setEditName] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unit, setUnit] = useState('units');
  const [unitCost, setUnitCost] = useState('');
  const [minStock, setMinStock] = useState('100');
  const [avgUsage, setAvgUsage] = useState('10');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await InventoryApi.getInventory();
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !unitCost) return;
    try {
      setSubmitting(true);
      await MaterialApi.createMaterial({
        name,
        code,
        unit,
        unit_cost: parseFloat(unitCost),
        min_stock_level: parseFloat(minStock) || 0,
        avg_daily_usage: parseFloat(avgUsage) || 0
      });
      setShowModal(false);
      setName('');
      setCode('');
      setUnitCost('');
      setMinStock('100');
      setAvgUsage('10');
      await fetchData();
    } catch (error) {
      console.error('Failed to add material', error);
      alert('Failed to add material. Please check if the material code is unique.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalValue = data.reduce((acc, curr) => acc + (curr.quantity * (curr.material?.unit_cost || 0)), 0);
  const criticalItems = data.filter(d => d.quantity <= (d.material?.min_stock_level || 0));

  const handleOpenEdit = (rec: InventoryRecord) => {
    setEditingRecord(rec);
    setEditQty(rec.quantity.toString());
    setEditMinStock(rec.material?.min_stock_level?.toString() || '0');
    setEditUnitCost(rec.material?.unit_cost?.toString() || '0');
    setEditAvgUsage(rec.material?.avg_daily_usage?.toString() || '0');
    setEditName(rec.material?.name || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      setSubmitting(true);
      await InventoryApi.updateInventory(editingRecord.id, {
        quantity: parseFloat(editQty),
        min_stock_level: parseFloat(editMinStock),
        unit_cost: parseFloat(editUnitCost),
        avg_daily_usage: parseFloat(editAvgUsage),
        name: editName
      });
      setEditingRecord(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update inventory record', err);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<InventoryRecord>[] = [
    { key: 'material.code', label: 'Code', render: (r) => <span className="font-mono font-medium text-gray-900">{r.material?.code}</span> },
    { key: 'material.name', label: 'Material Name', render: (r) => <span className="font-medium">{r.material?.name}</span> },
    { key: 'quantity', label: 'Current Stock', render: (r) => <span className="font-semibold">{r.quantity} {r.material?.unit}</span> },
    { key: 'min_stock', label: 'Safety Threshold', render: (r) => `${r.material?.min_stock_level} ${r.material?.unit}` },
    { key: 'value', label: 'Total Value', render: (r) => `$${(r.quantity * (r.material?.unit_cost || 0)).toLocaleString()}` },
    { key: 'status', label: 'Status', render: (r) => {
        const status = r.quantity <= (r.material?.min_stock_level || 0) ? 'critical' : 
                       r.quantity <= (r.material?.min_stock_level || 0) * 1.5 ? 'low' : 'healthy';
        return <StatusBadge status={status} type="inventory" />;
      }
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEdit(r);
          }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center space-x-1"
          title="Edit material stock & safety parameters"
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
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2 shadow-sm"
        >
          <Plus size={18} />
          <span>Add Raw Material</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Total Materials" value={data.length} icon={Package} />
        <KPICard title="Total Inventory Value" value={`$${totalValue.toLocaleString()}`} icon={ArrowDown} color="green" />
        <KPICard title="Critical Stock Items" value={criticalItems.length} icon={AlertTriangle} color={criticalItems.length > 0 ? "red" : "green"} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Current Stock Levels</h2>
        </div>
        
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading inventory data...</div>
        ) : (
          <DataTable columns={columns} data={data} itemsPerPage={15} />
        )}
      </div>

      {/* Add Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add Raw Material</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Titanium Alloy Rod 12mm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAT-026"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="150"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Usage</label>
                  <input
                    type="number"
                    value={avgUsage}
                    onChange={(e) => setAvgUsage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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
                  {submitting ? 'Saving...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Material & Stock</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{editingRecord.material?.code}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock ({editingRecord.material?.unit || 'units'})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safety Threshold</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editUnitCost}
                    onChange={(e) => setEditUnitCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avg Daily Usage</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editAvgUsage}
                    onChange={(e) => setEditAvgUsage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
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

export default InventoryPage;
