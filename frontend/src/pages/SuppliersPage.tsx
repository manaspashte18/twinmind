import React, { useEffect, useState } from 'react';
import { Supplier } from '../types';
import { SupplierApi } from '../services/api';
import DataTable, { Column } from '../components/DataTable';
import KPICard from '../components/KPICard';
import { Truck, CheckCircle, Clock, Plus, X, Edit2, Check } from 'lucide-react';

const SuppliersPage: React.FC = () => {
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvgDeliveryDays, setEditAvgDeliveryDays] = useState('');
  const [editOnTimeRate, setEditOnTimeRate] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [avgDeliveryDays, setAvgDeliveryDays] = useState('7');
  const [onTimeRate, setOnTimeRate] = useState('95');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await SupplierApi.getSuppliers();
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      setSubmitting(true);
      await SupplierApi.createSupplier({
        name,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        avg_delivery_days: parseFloat(avgDeliveryDays) || 7.0,
        on_time_delivery_rate: (parseFloat(onTimeRate) || 95) / 100.0
      });
      setShowModal(false);
      setName('');
      setContactEmail('');
      setContactPhone('');
      setAvgDeliveryDays('7');
      setOnTimeRate('95');
      await fetchData();
    } catch (error) {
      console.error('Failed to create supplier', error);
      alert('Failed to create supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setEditName(sup.name);
    setEditEmail(sup.contact_email || '');
    setEditPhone(sup.contact_phone || '');
    setEditAvgDeliveryDays(sup.avg_delivery_days.toString());
    const pct = Math.round(sup.on_time_delivery_rate <= 1 ? sup.on_time_delivery_rate * 100 : sup.on_time_delivery_rate);
    setEditOnTimeRate(pct.toString());
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    try {
      setSubmitting(true);
      await SupplierApi.updateSupplier(editingSupplier.id, {
        name: editName,
        contact_email: editEmail || null,
        contact_phone: editPhone || null,
        avg_delivery_days: parseFloat(editAvgDeliveryDays) || 7.0,
        on_time_delivery_rate: (parseFloat(editOnTimeRate) || 95) / 100.0
      });
      setEditingSupplier(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update supplier', err);
      alert('Failed to update supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgDelivery = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.avg_delivery_days, 0) / data.length).toFixed(1) : '0';
  const avgReliability = data.length > 0 
    ? (data.reduce((acc, curr) => acc + (curr.on_time_delivery_rate * (curr.on_time_delivery_rate <= 1 ? 100 : 1)), 0) / data.length).toFixed(1) 
    : '0';

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Supplier Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'contact_email', label: 'Contact Email', render: (r) => r.contact_email || 'procurement@supplier.com' },
    { key: 'contact_phone', label: 'Phone', render: (r) => r.contact_phone || '+91 98200 44556' },
    { key: 'avg_delivery_days', label: 'Avg Delivery', render: (r) => `${r.avg_delivery_days} days` },
    { key: 'on_time_delivery_rate', label: 'On-Time Rate', render: (r) => {
      const pct = Math.round(r.on_time_delivery_rate <= 1 ? r.on_time_delivery_rate * 100 : r.on_time_delivery_rate);
      return (
        <div className="flex items-center space-x-2">
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} 
              style={{ width: `${pct}%` }}
            ></div>
          </div>
          <span className="text-xs font-semibold">{pct}%</span>
        </div>
      );
    }},
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
          title="Edit supplier details & lead time"
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
        <h1 className="text-2xl font-bold text-gray-900">Supplier Network</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2 shadow-sm"
        >
          <Plus size={18} />
          <span>Add Supplier</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Total Suppliers" value={data.length} icon={Truck} />
        <KPICard title="Network Avg Delivery" value={`${avgDelivery} days`} icon={Clock} color="orange" />
        <KPICard title="Network Reliability" value={`${avgReliability}%`} icon={CheckCircle} color="green" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Supplier Directory</h2>
        </div>
        
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading suppliers...</div>
        ) : (
          <DataTable columns={columns} data={data} itemsPerPage={10} />
        )}
      </div>

      {/* Add Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Supplier</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Fasteners"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="sales@apexfasteners.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 22 2568 9900"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avg Lead Time (Days)</label>
                  <input
                    type="number"
                    value={avgDeliveryDays}
                    onChange={(e) => setAvgDeliveryDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">On-Time Rate (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={onTimeRate}
                    onChange={(e) => setOnTimeRate(e.target.value)}
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
                  {submitting ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Supplier Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Supplier ID: #{editingSupplier.id}</p>
              </div>
              <button onClick={() => setEditingSupplier(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Company Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avg Lead Time (Days)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editAvgDeliveryDays}
                    onChange={(e) => setEditAvgDeliveryDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">On-Time Rate (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    required
                    value={editOnTimeRate}
                    onChange={(e) => setEditOnTimeRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
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

export default SuppliersPage;
